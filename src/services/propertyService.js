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
import { db } from '../firebase';
import { uploadMultipleImages, deleteImage } from '../firebase/storageFunctions';

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
  // Storage check removed - using Cloudinary now
};

const PROPERTIES_COLLECTION = 'properties';
const PROPERTY_TYPES = ['sale', 'rent', 'renovation', 'buy', 'sell'];
const PROPERTY_STATUSES = ['draft', 'pending', 'published', 'sold', 'rented', 'archived'];

// In-memory cache for storage path to download URL conversions (read-time normalization)
const storagePathToUrlCache = new Map();

/**
 * Check if a string is a Firebase Storage path (not a full URL)
 * @param {string} value - Value to check
 * @returns {boolean} - True if it looks like a storage path
 */
const isStoragePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  // Storage paths typically don't start with http:// or https://
  // They may contain slashes and look like: "properties/uid/file.jpg"
  const trimmed = value.trim();
  return !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && trimmed.includes('/');
};

/**
 * Convert a Firebase Storage path to a download URL
 * @param {string} storagePath - Storage path
 * @returns {Promise<string|null>} - Download URL or null if failed
 * @deprecated Legacy Firebase Storage path conversion - no longer supported (using Cloudinary)
 */
const convertStoragePathToUrl = async (storagePath) => {
  // Legacy Firebase Storage path – no longer supported
  // Firebase Storage has been replaced with Cloudinary
  // Return null to indicate the path cannot be converted
  if (!storagePath) return null;
  
  // Check cache first (may contain previously converted URLs)
  if (storagePathToUrlCache.has(storagePath)) {
    return storagePathToUrlCache.get(storagePath);
  }
  
  // Legacy paths cannot be converted - return null
  console.warn('Legacy Firebase Storage path detected (no longer supported):', storagePath);
  storagePathToUrlCache.set(storagePath, null);
  return null;
};

/**
 * Normalize a single image value (string, storage path, or invalid)
 * @param {any} value - Image value to normalize
 * @returns {Promise<string|null>} - Valid HTTPS URL or null
 */
const normalizeImageValue = async (value) => {
  // Handle null, undefined, empty string
  if (!value || value === null || value === undefined) return null;
  
  // Handle non-string values (File objects, blobs, etc.)
  if (typeof value !== 'string') {
    console.warn('Non-string image value detected, skipping:', typeof value);
    return null;
  }
  
  const trimmed = value.trim();
  
  // Empty string
  if (trimmed.length === 0) return null;
  
  // Already a valid HTTPS URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  
  // Firebase Storage path - convert to download URL
  if (isStoragePath(trimmed)) {
    return await convertStoragePathToUrl(trimmed);
  }
  
  // Invalid format
  console.warn('Invalid image value format:', trimmed);
  return null;
};

/**
 * Normalize property images at read time (no Firestore writes)
 * Handles legacy formats: storage paths, empty strings, null, non-strings
 * @param {Object} property - Property object from Firestore
 * @returns {Promise<Object>} - Property with normalized images
 */
const normalizePropertyImages = async (property) => {
  if (!property) return property;
  
  // Normalize photos array
  let photos = [];
  if (Array.isArray(property.photos)) {
    // Process all photos in parallel
    const photoPromises = property.photos.map(photo => normalizeImageValue(photo));
    const normalizedPhotos = await Promise.all(photoPromises);
    photos = normalizedPhotos.filter(url => url !== null); // Remove nulls
  } else if (property.photos && typeof property.photos === 'string') {
    // Handle single photo as string
    const normalized = await normalizeImageValue(property.photos);
    if (normalized) photos = [normalized];
  }
  
  // Normalize coverImage
  let coverImage = null;
  if (property.coverImage) {
    coverImage = await normalizeImageValue(property.coverImage);
  }
  
  // If coverImage is null but photos exist, use first photo
  if (!coverImage && photos.length > 0) {
    coverImage = photos[0];
  }
  
  // Handle legacy imageUrl field
  if (!coverImage && !photos.length && property.imageUrl) {
    const normalized = await normalizeImageValue(property.imageUrl);
    if (normalized) {
      photos = [normalized];
      coverImage = normalized;
    }
  }
  
  // Handle legacy image field
  if (!coverImage && !photos.length && property.image) {
    const normalized = await normalizeImageValue(property.image);
    if (normalized) {
      photos = [normalized];
      coverImage = normalized;
    }
  }
  
  return {
    ...property,
    photos, // Always an array of valid HTTPS URLs
    coverImage, // Valid HTTPS URL or null
  };
};

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

      // FIXED: Default status to 'published' to match browse query filters
      // Browse queries filter by status === 'published', so new properties must have this status
      const finalStatus = propertyData.status || 'published';
      
      console.log('Creating property in Firestore:', {
        type: propertyData.type.toLowerCase(),
        listingType: listingTypeValue,
        title: propertyData.title,
        status: finalStatus,
        ownerId: propertyData.ownerId,
      });

      // OPTIMIZED: Upload images FIRST in parallel, then create document with URLs in single write
      let photoURLs = [];
      if (images && images.length > 0) {
        // Use ownerId for image paths (we have it before document creation)
        // Images will be stored under properties/{ownerId}/{timestamp}/...
        const imagePathId = propertyData.ownerId;
        photoURLs = await this.uploadImages(imagePathId, images);
        // Note: Images are uploaded to user-specific path, URLs are valid and will work immediately
      }

      // OPTIMIZED: Create document with image URLs in single write (no update needed)
      // FIXED: Ensure all fields match browse query filters
      const propertyDoc = {
        title: propertyData.title,
        description: propertyData.description,
        price: Number(propertyData.price),
        currency: propertyData.currency || 'PKR',
        type: propertyData.type.toLowerCase(),
        listingType: listingTypeValue, // Explicitly set listingType for rental filtering
        status: finalStatus, // FIXED: Use 'published' to match browse query filters
        ownerId: propertyData.ownerId, // REQUIRED: Must match request.auth.uid
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
        // FIXED: Store location as object with lat, lng, address (not GeoPoint for compatibility)
        location: propertyData.location ? {
          lat: propertyData.location.lat,
          lng: propertyData.location.lng,
          address: propertyData.location.address || propertyData.address?.line1 || null,
        } : null,
        bedrooms: Number(propertyData.bedrooms) || 0,
        bathrooms: Number(propertyData.bathrooms) || 0,
        areaSqFt: Number(propertyData.areaSqFt) || 0,
        yearBuilt: propertyData.yearBuilt ? Number(propertyData.yearBuilt) : null,
        furnished: Boolean(propertyData.furnished),
        parking: Boolean(propertyData.parking),
        amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities : [],
        // NORMALIZED: Use ONLY photos (array) and coverImage (string or null)
        photos: photoURLs, // Array of download URL strings
        coverImage: photoURLs[0] || null, // First image as cover
        videos: propertyData.videos || null,
        featured: Boolean(propertyData.featured),
        views: 0,
        favoritesCount: 0,
        // REQUIRED: Use serverTimestamp() for createdAt/updatedAt (not new Date())
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const propertyRef = await addDoc(collection(db, PROPERTIES_COLLECTION), propertyDoc);
      const propertyId = propertyRef.id;

      // Debug logging (dev mode only)
      if (import.meta.env.DEV) {
        console.log('✅ Property created successfully:', {
          propertyId,
          status: finalStatus,
          type: propertyData.type.toLowerCase(),
          listingType: listingTypeValue,
          ownerId: propertyData.ownerId,
          hasPhotos: photoURLs.length > 0,
          createdAt: 'serverTimestamp()',
        });
      }

      return propertyId;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating property:', error);
      }
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

      // NORMALIZE: Normalize images at read time (handles legacy formats)
      const normalizedProperty = await normalizePropertyImages(propertyData);
      return normalizedProperty;
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
  /**
   * Fetch all properties with simple Firestore query, then apply filters/sorting client-side
   * This approach eliminates all Firestore index requirements
   * 
   * @param {Object} filters - Filter criteria (applied client-side)
   * @param {Object} options - Sort and limit options (applied client-side)
   * @returns {Promise<Array>} - Array of filtered and sorted properties
   */
  async getAll(filters = {}, options = {}) {
    try {
      if (!db) {
        console.error('❌ ERROR: Firestore db is not initialized!');
        return [];
      }

      // SIMPLE QUERY: Fetch all properties without any filters or orderBy
      // This eliminates all Firestore index requirements
      const q = query(collection(db, PROPERTIES_COLLECTION));
      
      const snapshot = await getDocs(q);
      
      // Normalize all properties
      let results = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const property = {
            id: doc.id,
            ...data,
            status: data.status || 'published',
          };
          return await normalizePropertyImages(property);
        })
      );

      // APPLY ALL FILTERS CLIENT-SIDE
      if (filters.status) {
        results = results.filter((p) => p.status === filters.status);
      }

      if (filters.type) {
        results = results.filter((p) => {
          const propertyType = p.listingType || p.type || '';
          return propertyType.toLowerCase() === filters.type.toLowerCase();
        });
      }

      if (filters.city && filters.city.trim()) {
        const cityLower = filters.city.toLowerCase();
        results = results.filter((p) => {
          const propertyCity = p.address?.city?.toLowerCase() || p.city?.toLowerCase() || '';
          return propertyCity.includes(cityLower);
        });
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

      if (filters.furnished !== undefined && filters.furnished !== null) {
        results = results.filter((p) => Boolean(p.furnished) === Boolean(filters.furnished));
      }

      if (filters.parking !== undefined && filters.parking !== null) {
        results = results.filter((p) => Boolean(p.parking) === Boolean(filters.parking));
      }

      if (filters.featured !== undefined) {
        results = results.filter((p) => Boolean(p.featured) === Boolean(filters.featured));
      }

      // APPLY SORTING CLIENT-SIDE
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';

      if (sortBy === 'createdAt') {
        results.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
        });
      } else if (sortBy === 'price') {
        results.sort((a, b) => {
          const aPrice = a.price || 0;
          const bPrice = b.price || 0;
          return sortOrder === 'desc' ? bPrice - aPrice : aPrice - bPrice;
        });
      }

      // APPLY LIMIT CLIENT-SIDE
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      console.error('❌ ERROR in getAll:', error);
      // Return empty array instead of throwing to prevent app crash
      if (error.code === 'permission-denied') {
        console.error('🔒 PERMISSION DENIED - Check Firestore security rules!');
      }
      return [];
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
   * @returns {Promise<Array>} - Array of Cloudinary secure URLs
   */
  async uploadImages(propertyId, images) {
    try {
      // Images are optional - return empty array if no images provided
      if (!images || !Array.isArray(images) || images.length === 0) {
        return [];
      }

      // Upload to Cloudinary using storageFunctions (which uses Cloudinary)
      const folder = `properties/${propertyId}`;
      const secureUrls = await uploadMultipleImages(images, folder);

      return secureUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      // Don't throw error - return empty array to allow form submission
      return [];
    }
  }

  /**
   * Delete all images for a property
   * Note: Cloudinary deletion requires Admin API (backend only).
   * This function is kept for compatibility but does not perform deletion.
   * @param {string} propertyId - Property document ID
   * @returns {Promise<void>}
   */
  async deleteImages(propertyId) {
    try {
      // Cloudinary deletion requires Admin API (backend only)
      // This function is kept for compatibility
      console.warn(
        'Image deletion not supported with Cloudinary unsigned upload preset. ' +
        `Property ID: ${propertyId}`
      );
    } catch (error) {
      console.error('Error in deleteImages:', error);
      // Don't throw error
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

      // Use the deleteImage function from storageFunctions (which handles Cloudinary)
      await deleteImage(imageUrl);
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
