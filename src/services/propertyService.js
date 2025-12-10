import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { db, storage } from '../firebase';

// Safety check for Firebase services
const checkFirebaseServices = () => {
  if (!db) {
    const error = new Error(
      'Firestore database is not initialized. Please check your Firebase configuration.'
    );
    console.error('❌ CRITICAL: Firestore db is null!');
    console.error('   → Check Firebase config in src/firebase/config.js');
    console.error('   → Verify .env.local file exists with VITE_FIREBASE_* variables');
    console.error('   → Ensure Firebase app is initialized');
    throw error;
  }
  if (!storage) {
    console.warn('⚠️ Firebase Storage is not initialized (non-critical for property fetching)');
  }
};

const PROPERTIES_COLLECTION = 'properties';
const PROPERTY_TYPES = ['sale', 'rent', 'renovation', 'buy', 'sell'];
const PROPERTY_STATUSES = ['draft', 'pending', 'published', 'sold', 'rented', 'archived'];

/**
 * Property Service Class
 * Handles all CRUD operations for properties including sale, rent, and renovation types
 */
class PropertyService {
  /**
   * Create a new property
   * @param {Object} propertyData - Property data object
   * @param {Array} images - Array of image files (optional)
   * @returns {Promise<string>} - Property document ID
   */
  async create(propertyData, images = []) {
    try {
      checkFirebaseServices();
      
      // FIXED: Ensure user is authenticated before creating property (per Firestore rules: allow write: if request.auth != null)
      const { auth } = await import('../firebase');
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to create properties');
      }
      
      // FIXED: Ensure ownerId matches authenticated user
      if (propertyData.ownerId && propertyData.ownerId !== auth.currentUser.uid) {
        throw new Error('Owner ID must match authenticated user');
      }
      
      // FIXED: Set ownerId from authenticated user if not provided
      if (!propertyData.ownerId) {
        propertyData.ownerId = auth.currentUser.uid;
      }

      // Validate property type
      if (!PROPERTY_TYPES.includes(propertyData.type?.toLowerCase())) {
        throw new Error(`Invalid property type. Must be one of: ${PROPERTY_TYPES.join(', ')}`);
      }

      // Validate required fields
      const requiredFields = ['title', 'description', 'price', 'type', 'ownerId', 'address'];
      const missingFields = requiredFields.filter((field) => !propertyData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Create property document
      // Ensure listingType is set correctly - use explicit value or fallback to type
      const listingTypeValue = propertyData.listingType
        ? propertyData.listingType.toLowerCase()
        : propertyData.type.toLowerCase();

      console.log('Creating property in Firestore:', {
        type: propertyData.type.toLowerCase(),
        listingType: listingTypeValue,
        title: propertyData.title,
        status: propertyData.status || 'pending',
      });

      const propertyRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
        title: propertyData.title,
        description: propertyData.description,
        price: Number(propertyData.price),
        currency: propertyData.currency || 'PKR',
        type: propertyData.type.toLowerCase(),
        listingType: listingTypeValue, // Explicitly set listingType for rental filtering
        status: propertyData.status || 'pending',
        ownerId: propertyData.ownerId,
        ownerName: propertyData.ownerName || null,
        ownerPhone: propertyData.ownerPhone || null,
        address: {
          line1: propertyData.address.line1 || propertyData.address,
          line2: propertyData.address.line2 || null,
          city: propertyData.address.city || propertyData.city,
          state: propertyData.address.state || propertyData.state || null,
          country: propertyData.address.country || propertyData.country || 'Pakistan',
          postalCode: propertyData.address.postalCode || propertyData.postalCode || null,
        },
        location: propertyData.location || null, // GeoPoint if needed
        bedrooms: Number(propertyData.bedrooms) || 0,
        bathrooms: Number(propertyData.bathrooms) || 0,
        areaSqFt: Number(propertyData.areaSqFt) || 0,
        yearBuilt: propertyData.yearBuilt ? Number(propertyData.yearBuilt) : null,
        furnished: Boolean(propertyData.furnished),
        parking: Boolean(propertyData.parking),
        amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : [],
        photos: [],
        coverImage: null,
        videos: propertyData.videos || null,
        featured: Boolean(propertyData.featured),
        views: 0,
        favoritesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const propertyId = propertyRef.id;

      // Upload images if provided
      if (images && images.length > 0) {
        const photoURLs = await this.uploadImages(propertyId, images);
        await updateDoc(propertyRef, {
          photos: photoURLs,
          coverImage: photoURLs[0] || null,
          updatedAt: serverTimestamp(),
        });
      }

      return propertyId;
    } catch (error) {
      console.error('Error creating property:', error);
      throw new Error(error.message || 'Failed to create property');
    }
  }

  /**
   * Get property by ID
   * @param {string} propertyId - Property document ID
   * @param {boolean} incrementViews - Whether to increment view count
   * @returns {Promise<Object>} - Property data
   */
  async getById(propertyId, incrementViews = true) {
    try {
      checkFirebaseServices();

      if (!propertyId) throw new Error('Property ID is required');

      const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      const propertyData = { id: propertySnap.id, ...propertySnap.data() };

      // Increment views if requested
      if (incrementViews) {
        updateDoc(propertyRef, {
          views: increment(1),
          updatedAt: serverTimestamp(),
        }).catch((err) => console.error('Error incrementing views:', err));
      }

      return propertyData;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw new Error(error.message || 'Failed to fetch property');
    }
  }

  /**
   * Get all properties with optional filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options (sortBy, limit, startAfter)
   * @returns {Promise<Array>} - Array of properties
   */
  async getAll(filters = {}, options = {}) {
    try {
      if (!db) {
        console.error('❌ ERROR: Firestore db is not initialized!');
        return [];
      }

      // AUTO-FIXED: Properties collection allows public read per Firestore rules
      console.log('Fetching properties with filters:', filters);

      let q;
      
      // AUTO-FIXED: Build server-side query using where() clauses (rule-compliant)
      if (filters.status) {
        q = query(
          collection(db, PROPERTIES_COLLECTION),
          where('status', '==', filters.status)
        );
        console.log(`🔍 Querying with status filter: ${filters.status}`);
      } else if (filters.featured !== undefined) {
        // AUTO-FIXED: Use server-side query for featured properties
        q = query(
          collection(db, PROPERTIES_COLLECTION),
          where('featured', '==', filters.featured),
          where('status', '==', 'published')
        );
        console.log(`🔍 Querying featured properties: ${filters.featured}`);
      } else {
        // Fetch all properties (public read allowed)
        q = query(collection(db, PROPERTIES_COLLECTION), limit(100));
        console.log('🔍 Querying ALL properties (public read allowed)...');
      }

      try {
        console.log('🔍 Executing Firestore query on collection:', PROPERTIES_COLLECTION);
        console.log('🔍 Query details:', {
          collection: PROPERTIES_COLLECTION,
          filters: filters,
          hasWhere: q._queryConstraints?.some(c => c.type === 'where'),
          hasLimit: q._queryConstraints?.some(c => c.type === 'limit'),
        });
        const snapshot = await getDocs(q);
        console.log(`✅ Fetched ${snapshot.docs.length} properties from Firestore`);
        
        if (snapshot.docs.length === 0) {
          console.warn('⚠️ No properties found. Possible reasons:');
          console.warn('  1. Collection is empty');
          console.warn('  2. Status filter is too restrictive (only "published" properties are shown)');
          console.warn('  3. Firestore rules are blocking access');
          console.warn('  4. Collection name mismatch');
          console.warn('  5. User not authenticated (check Firestore rules)');
          
          // FIXED: Try a simple query to test if collection exists and rules allow access
          try {
            console.log('🔄 Testing simple query without filters...');
            const testQuery = query(collection(db, PROPERTIES_COLLECTION), limit(1));
            const testSnapshot = await getDocs(testQuery);
            console.log(`   ✅ Test query successful: ${testSnapshot.docs.length} documents`);
            if (testSnapshot.docs.length > 0) {
              console.log('   ✅ Collection exists and is accessible');
              console.log('   Sample document ID:', testSnapshot.docs[0].id);
            } else {
              console.warn('   ⚠️ Collection exists but is empty');
            }
          } catch (testError) {
            console.error('   ❌ Test query failed:', testError.code, testError.message);
            console.error('   Full error:', testError);
            if (testError.code === 'permission-denied') {
              console.error('   🔒 PERMISSION DENIED - Rules need to be deployed!');
              console.error('   📋 Required rules:');
              console.error('      match /properties/{propertyId} {');
              console.error('        allow get: if true;');
              console.error('        allow list: if true;');
              console.error('      }');
              throw new Error(
                'Permission denied. Please deploy Firestore security rules. ' +
                'The rules should allow public read access: allow get: if true; allow list: if true; ' +
                'See FIREBASE_RULES_DEPLOYMENT.md for deployment instructions.'
              );
            }
            // Re-throw the original error if it's a permission error
            throw testError;
          }
        }

        // Convert to array
        let results = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure status exists (default to 'published' if not set)
          status: data.status || 'published',
        };
      });

      console.log(`Processing ${results.length} properties with filters:`, filters);
      console.log(
        'Sample property statuses:',
        results.slice(0, 5).map((p) => ({ id: p.id, status: p.status }))
      );
      console.log(
        'Sample property images:',
        results.slice(0, 3).map((p) => ({
          id: p.id,
          title: p.title,
          photos: p.photos,
          coverImage: p.coverImage,
          imageUrl: p.imageUrl,
          hasPhotos: Array.isArray(p.photos) && p.photos.length > 0,
        }))
      );

      // Apply all filters client-side
      // Make status filter optional - if no status filter, show all properties
      if (filters.status) {
        const beforeCount = results.length;
        results = results.filter((p) => p.status === filters.status);
        console.log(
          `After status filter (${filters.status}): ${beforeCount} -> ${results.length} properties`
        );
      } else {
        // If no status filter, show all properties (including published, pending, etc.)
        console.log(`No status filter - showing all ${results.length} properties`);
      }

      if (filters.type) {
        results = results.filter((p) => p.type === filters.type.toLowerCase());
        console.log(`After type filter (${filters.type}): ${results.length} properties`);
      }

      if (filters.city) {
        results = results.filter((p) => p.address?.city === filters.city);
        console.log(`After city filter (${filters.city}): ${results.length} properties`);
      }

      if (filters.ownerId) {
        results = results.filter((p) => p.ownerId === filters.ownerId);
      }

      if (typeof filters.minPrice === 'number') {
        results = results.filter((p) => (p.price || 0) >= filters.minPrice);
      }

      if (typeof filters.maxPrice === 'number') {
        results = results.filter((p) => (p.price || 0) <= filters.maxPrice);
      }

      if (typeof filters.minBedrooms === 'number') {
        results = results.filter((p) => (p.bedrooms || 0) >= filters.minBedrooms);
      }

      if (typeof filters.minBathrooms === 'number') {
        results = results.filter((p) => (p.bathrooms || 0) >= filters.minBathrooms);
      }

      if (typeof filters.minArea === 'number') {
        results = results.filter((p) => (p.areaSqFt || 0) >= filters.minArea);
      }

      if (filters.furnished !== undefined) {
        results = results.filter((p) => Boolean(p.furnished) === Boolean(filters.furnished));
      }

      if (filters.parking !== undefined) {
        results = results.filter((p) => Boolean(p.parking) === Boolean(filters.parking));
      }

      if (filters.featured !== undefined) {
        results = results.filter((p) => Boolean(p.featured) === Boolean(filters.featured));
      }

      // Apply sorting client-side
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';

      if (sortBy === 'createdAt' && sortOrder === 'desc') {
        results.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
      } else if (sortBy === 'createdAt' && sortOrder === 'asc') {
        results.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return aTime - bTime;
        });
      } else if (sortBy === 'price' && sortOrder === 'desc') {
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'price' && sortOrder === 'asc') {
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
      }

      // Apply limit after filtering
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

        console.log(`Returning ${results.length} properties after filtering and sorting`);
        return results;
      } catch (queryError) {
        console.error('❌ ERROR: Firestore query failed!');
        console.error('   Error Code:', queryError.code);
        console.error('   Error Message:', queryError.message);
        console.error('   Full Error:', queryError);
        console.error('   Collection:', PROPERTIES_COLLECTION);
        console.error('   Filters:', filters);
        console.error('   DB Initialized:', !!db);
        
        // Check if db is null
        if (!db) {
          const error = new Error('Firestore database is not initialized. Please check Firebase configuration.');
          console.error('❌ CRITICAL: Firestore db is null!');
          throw error;
        }
        
        // If permission or index error, try fetching all and filtering client-side
        if (queryError.code === 'permission-denied' || queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
          if (queryError.code === 'permission-denied') {
            console.error('🔒 PERMISSION DENIED - Check Firestore security rules!');
            console.error('   Properties collection should allow public read access');
            console.error('   Current user:', 'Check auth state in browser console');
            console.warn('   Attempting fallback query without filters...');
          } else if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
            console.error('📊 INDEX REQUIRED - Create a Firestore index!');
            console.error('   Check browser console for index creation link');
            console.warn('   Attempting fallback query without orderBy...');
          }
          
          // Fallback: fetch all properties without status filter (should be allowed by rules)
          try {
            console.log('🔄 Attempting fallback query without filters...');
            let fallbackQ = query(
              collection(db, PROPERTIES_COLLECTION),
              limit(100)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQ);
            console.log(`✅ Fallback query successful: ${fallbackSnapshot.docs.length} documents`);
            let results = fallbackSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              status: doc.data().status || 'published',
            }));
            
            // Apply remaining filters client-side
            if (filters.type) {
              results = results.filter((p) => p.type === filters.type.toLowerCase());
            }
            
            if (filters.city) {
              results = results.filter((p) => p.address?.city === filters.city);
            }
            
            if (filters.ownerId) {
              results = results.filter((p) => p.ownerId === filters.ownerId);
            }
            
            if (typeof filters.minPrice === 'number') {
              results = results.filter((p) => (p.price || 0) >= filters.minPrice);
            }
            
            if (typeof filters.maxPrice === 'number') {
              results = results.filter((p) => (p.price || 0) <= filters.maxPrice);
            }
            
            if (typeof filters.minBedrooms === 'number') {
              results = results.filter((p) => (p.bedrooms || 0) >= filters.minBedrooms);
            }
            
            if (typeof filters.minBathrooms === 'number') {
              results = results.filter((p) => (p.bathrooms || 0) >= filters.minBathrooms);
            }
            
            if (typeof filters.minArea === 'number') {
              results = results.filter((p) => (p.areaSqFt || 0) >= filters.minArea);
            }
            
            if (filters.furnished !== undefined) {
              results = results.filter((p) => Boolean(p.furnished) === Boolean(filters.furnished));
            }
            
            if (filters.parking !== undefined) {
              results = results.filter((p) => Boolean(p.parking) === Boolean(filters.parking));
            }
            
            if (filters.featured !== undefined) {
              results = results.filter((p) => Boolean(p.featured) === Boolean(filters.featured));
            }

            // Apply sorting client-side
            const sortBy = options.sortBy || 'createdAt';
            const sortOrder = options.sortOrder || 'desc';

            if (sortBy === 'createdAt' && sortOrder === 'desc') {
              results.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                return bTime - aTime;
              });
            } else if (sortBy === 'createdAt' && sortOrder === 'asc') {
              results.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                return aTime - bTime;
              });
            } else if (sortBy === 'price' && sortOrder === 'desc') {
              results.sort((a, b) => (b.price || 0) - (a.price || 0));
            } else if (sortBy === 'price' && sortOrder === 'asc') {
              results.sort((a, b) => (a.price || 0) - (b.price || 0));
            }

            // Apply limit after filtering
            if (options.limit) {
              results = results.slice(0, options.limit);
            }

            return results;
          } catch (fallbackError) {
            console.error('❌ CRITICAL: Fallback query also failed!');
            console.error('   Error Code:', fallbackError.code);
            console.error('   Error Message:', fallbackError.message);
            console.error('   This indicates a serious Firestore configuration issue');
            
            if (fallbackError.code === 'permission-denied') {
              throw new Error(
                'Permission denied. Please check Firestore security rules for the properties collection. ' +
                'The rules should allow public read access: allow read: if true;'
              );
            } else if (fallbackError.code === 'failed-precondition') {
              throw new Error(
                'Firestore index required. Please create the required index. ' +
                'Check the browser console for the index creation link.'
              );
            } else {
              throw new Error(
                `Failed to fetch properties: ${fallbackError.message || 'Unknown error'}`
              );
            }
          }
        } else {
          // For other errors, throw with detailed message
          throw new Error(
            `Failed to fetch properties: ${queryError.message || 'Unknown error'} (Code: ${queryError.code || 'N/A'})`
          );
        }
      }
    } catch (error) {
      console.error('❌ ERROR in getAll:', error);
      console.error('   Stack:', error.stack);
      // Re-throw with more context
      if (error.message.includes('not initialized')) {
        throw error;
      }
      throw new Error(`Failed to fetch properties: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get properties by owner
   * @param {string} ownerId - Owner user ID
   * @returns {Promise<Array>} - Array of properties
   */
  async getByOwner(ownerId) {
    try {
      if (!ownerId) throw new Error('Owner ID is required');
      return this.getAll({ ownerId }, { sortBy: 'createdAt', sortOrder: 'desc' });
    } catch (error) {
      console.error('Error fetching owner properties:', error);
      throw new Error(error.message || 'Failed to fetch owner properties');
    }
  }

  /**
   * Update property
   * @param {string} propertyId - Property document ID
   * @param {Object} updates - Fields to update
   * @param {Array} newImages - New images to add (optional)
   * @returns {Promise<void>}
   */
  async update(propertyId, updates, newImages = []) {
    try {
      checkFirebaseServices();
      
      if (!propertyId) throw new Error('Property ID is required');

      // FIXED: Ensure user is authenticated before updating property
      const { auth } = await import('../firebase');
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to update properties');
      }

      const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      // FIXED: Ensure user owns the property or is updating their own property
      const propertyData = propertySnap.data();
      if (propertyData.ownerId && propertyData.ownerId !== auth.currentUser.uid) {
        throw new Error('Permission denied: You can only update your own properties');
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Handle address updates
      if (updates.address) {
        updateData.address = {
          ...propertySnap.data().address,
          ...updates.address,
        };
      }

      // Handle price updates
      if (updates.price !== undefined) {
        updateData.price = Number(updates.price);
      }

      // Handle numeric fields
      if (updates.bedrooms !== undefined) updateData.bedrooms = Number(updates.bedrooms);
      if (updates.bathrooms !== undefined) updateData.bathrooms = Number(updates.bathrooms);
      if (updates.areaSqFt !== undefined) updateData.areaSqFt = Number(updates.areaSqFt);

      // Handle boolean fields
      if (updates.furnished !== undefined) updateData.furnished = Boolean(updates.furnished);
      if (updates.parking !== undefined) updateData.parking = Boolean(updates.parking);
      if (updates.featured !== undefined) updateData.featured = Boolean(updates.featured);

      // Upload new images if provided
      if (newImages && newImages.length > 0) {
        const newPhotoURLs = await this.uploadImages(propertyId, newImages);
        const existingPhotos = propertySnap.data().photos || [];
        updateData.photos = [...existingPhotos, ...newPhotoURLs];
        if (!updateData.coverImage && newPhotoURLs.length > 0) {
          updateData.coverImage = newPhotoURLs[0];
        }
      }

      await updateDoc(propertyRef, updateData);
    } catch (error) {
      console.error('Error updating property:', error);
      throw new Error(error.message || 'Failed to update property');
    }
  }

  /**
   * Delete property
   * @param {string} propertyId - Property document ID
   * @returns {Promise<void>}
   */
  async delete(propertyId) {
    try {
      checkFirebaseServices();
      
      if (!propertyId) throw new Error('Property ID is required');

      // FIXED: Ensure user is authenticated before deleting property
      const { auth } = await import('../firebase');
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to delete properties');
      }

      const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      // FIXED: Ensure user owns the property
      const propertyData = propertySnap.data();
      if (propertyData.ownerId && propertyData.ownerId !== auth.currentUser.uid) {
        throw new Error('Permission denied: You can only delete your own properties');
      }

      // Delete all images from storage
      await this.deleteImages(propertyId);

      // Delete property document
      await deleteDoc(propertyRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw new Error(error.message || 'Failed to delete property');
    }
  }

  /**
   * Upload images for a property
   * @param {string} propertyId - Property document ID
   * @param {Array} images - Array of image files
   * @returns {Promise<Array>} - Array of download URLs
   */
  async uploadImages(propertyId, images) {
    try {
      // FIXED: Images are optional - return empty array if no images provided
      if (!images || !Array.isArray(images) || images.length === 0) {
        return [];
      }

      const uploadPromises = images
        .filter((image) => image instanceof File) // Filter out invalid files
        .map(async (image, index) => {
          try {
            const fileName = `${Date.now()}_${index}_${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const imageRef = storageRef(storage, `properties/${propertyId}/${fileName}`);

            await uploadBytes(imageRef, image);
            return getDownloadURL(imageRef);
          } catch (uploadError) {
            console.error(`Error uploading image ${index}:`, uploadError);
            // Continue with other uploads even if one fails
            return null;
          }
        });

      const results = await Promise.all(uploadPromises);
      // Filter out null results (failed uploads)
      return results.filter((url) => url !== null);
    } catch (error) {
      console.error('Error uploading images:', error);
      // FIXED: Don't throw error - return empty array to allow form submission
      return [];
    }
  }

  /**
   * Delete all images for a property
   * @param {string} propertyId - Property document ID
   * @returns {Promise<void>}
   */
  async deleteImages(propertyId) {
    try {
      const folderRef = storageRef(storage, `properties/${propertyId}`);
      const listResult = await listAll(folderRef);

      const deletePromises = listResult.items.map((item) => deleteObject(item));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting images:', error);
      // Don't throw error if folder doesn't exist
    }
  }

  /**
   * Delete a specific image from a property
   * @param {string} imageUrl - Full URL of the image to delete
   * @returns {Promise<void>}
   */
  async deleteImage(imageUrl) {
    try {
      // FIXED: Images are optional - gracefully handle null/empty URLs
      if (!imageUrl || !imageUrl.trim()) {
        console.warn('No image URL provided for deletion - skipping');
        return;
      }

      // Extract path from URL
      const urlParts = imageUrl.split('/');
      const pathIndex = urlParts.findIndex((part) => part === 'properties');
      if (pathIndex === -1) {
        console.warn('Invalid image URL format - skipping deletion');
        return;
      }

      const path = urlParts.slice(pathIndex).join('/');
      const imageRef = storageRef(storage, path);
      await deleteObject(imageRef);
    } catch (error) {
      // FIXED: Don't throw error if image doesn't exist - just log and continue
      if (error.code === 'storage/object-not-found') {
        console.warn('Image not found in storage - skipping deletion');
        return;
      }
      console.error('Error deleting image:', error);
      // Don't throw - allow operation to continue even if deletion fails
    }
  }

  /**
   * Search properties by text
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} - Array of matching properties
   */
  async search(searchTerm, filters = {}) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAll(filters);
      }

      const term = searchTerm.toLowerCase().trim();
      const properties = await this.getAll(filters);

      return properties.filter((property) => {
        const searchableText = [
          property.title,
          property.description,
          property.address?.city,
          property.address?.state,
          property.address?.line1,
          property.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(term);
      });
    } catch (error) {
      console.error('Error searching properties:', error);
      throw new Error(error.message || 'Failed to search properties');
    }
  }

  /**
   * Update property status
   * @param {string} propertyId - Property document ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(propertyId, status) {
    try {
      if (!PROPERTY_STATUSES.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${PROPERTY_STATUSES.join(', ')}`);
      }

      await this.update(propertyId, { status });
    } catch (error) {
      console.error('Error updating property status:', error);
      throw new Error(error.message || 'Failed to update property status');
    }
  }

  /**
   * Toggle favorite status for a property
   * @param {string} propertyId - Property document ID
   * @param {boolean} isFavorite - Whether to add or remove favorite
   * @returns {Promise<void>}
   */
  async toggleFavorite(propertyId, isFavorite) {
    try {
      const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
      await updateDoc(propertyRef, {
        favoritesCount: increment(isFavorite ? 1 : -1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error(error.message || 'Failed to toggle favorite');
    }
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
export default propertyService;
