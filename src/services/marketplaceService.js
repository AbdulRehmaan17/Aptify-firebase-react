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
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { db, storage } from '../firebase';

const MARKETPLACE_COLLECTION = 'marketplace';
const OFFERS_COLLECTION = 'offers';

/**
 * Marketplace Service Class
 * Handles all CRUD operations for marketplace items
 */
class MarketplaceService {
  /**
   * Create a new marketplace listing
   * @param {Object} listingData - Listing data object
   * @param {Array} images - Array of image files (optional)
   * @returns {Promise<string>} - Listing document ID
   */
  async create(listingData, images = []) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Validate required fields
      const requiredFields = ['title', 'description', 'price', 'category', 'sellerId', 'location'];
      const missingFields = requiredFields.filter((field) => !listingData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Create listing document
      const listingRef = await addDoc(collection(db, MARKETPLACE_COLLECTION), {
        title: listingData.title.trim(),
        description: listingData.description.trim(),
        price: Number(listingData.price),
        currency: listingData.currency || 'PKR',
        category: listingData.category,
        sellerId: listingData.sellerId,
        sellerName: listingData.sellerName || null,
        sellerEmail: listingData.sellerEmail || null,
        sellerPhone: listingData.sellerPhone || null,
        location: listingData.location.trim(),
        city: listingData.city?.trim() || null,
        condition: listingData.condition || 'new', // 'new', 'used', 'refurbished'
        status: listingData.status || 'pending', // 'pending', 'active', 'sold', 'removed'
        images: [],
        coverImage: null,
        views: 0,
        favoritesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const listingId = listingRef.id;

      // Upload images if provided
      if (images && images.length > 0) {
        const imageURLs = await this.uploadImages(listingId, images);
        await updateDoc(listingRef, {
          images: imageURLs,
          coverImage: imageURLs[0] || null,
          updatedAt: serverTimestamp(),
        });
      }

      return listingId;
    } catch (error) {
      console.error('Error creating marketplace listing:', error);
      throw new Error(error.message || 'Failed to create marketplace listing');
    }
  }

  /**
   * Get listing by ID
   * @param {string} listingId - Listing document ID
   * @param {boolean} incrementViews - Whether to increment view count
   * @returns {Promise<Object>} - Listing data
   */
  async getById(listingId, incrementViews = true) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!listingId) throw new Error('Listing ID is required');

      const listingRef = doc(db, MARKETPLACE_COLLECTION, listingId);
      const listingSnap = await getDoc(listingRef);

      if (!listingSnap.exists()) {
        throw new Error('Listing not found');
      }

      const listingData = {
        id: listingSnap.id,
        ...listingSnap.data(),
      };

      // Increment views if requested
      if (incrementViews) {
        await updateDoc(listingRef, {
          views: (listingData.views || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        listingData.views = (listingData.views || 0) + 1;
      }

      return listingData;
    } catch (error) {
      console.error('Error getting marketplace listing:', error);
      throw new Error(error.message || 'Failed to get marketplace listing');
    }
  }

  /**
   * Get all marketplace listings with filters
   * @param {Object} filters - Filter object
   * @param {Object} options - Query options (sortBy, sortOrder, limit, startAfter)
   * @returns {Promise<Array>} - Array of listing data
   */
  async getAll(filters = {}, options = {}) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      let listingsQuery = query(collection(db, MARKETPLACE_COLLECTION));

      // Apply filters
      if (filters.status) {
        listingsQuery = query(listingsQuery, where('status', '==', filters.status));
      } else {
        // Default to active listings
        listingsQuery = query(listingsQuery, where('status', '==', 'active'));
      }

      if (filters.category) {
        listingsQuery = query(listingsQuery, where('category', '==', filters.category));
      }

      if (filters.city) {
        listingsQuery = query(listingsQuery, where('city', '==', filters.city));
      }

      if (filters.minPrice !== undefined) {
        listingsQuery = query(listingsQuery, where('price', '>=', Number(filters.minPrice)));
      }

      if (filters.maxPrice !== undefined) {
        listingsQuery = query(listingsQuery, where('price', '<=', Number(filters.maxPrice)));
      }

      if (filters.sellerId) {
        listingsQuery = query(listingsQuery, where('sellerId', '==', filters.sellerId));
      }

      // Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      try {
        listingsQuery = query(listingsQuery, orderBy(sortBy, sortOrder));
      } catch (error) {
        console.warn('Error applying orderBy, sorting client-side:', error);
      }

      // Apply limit
      if (options.limit) {
        listingsQuery = query(listingsQuery, limit(options.limit));
      }

      const snapshot = await getDocs(listingsQuery);
      let listings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side filtering for price range if needed
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        listings = listings.filter((listing) => {
          const price = listing.price || 0;
          if (filters.minPrice !== undefined && price < filters.minPrice) return false;
          if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
          return true;
        });
      }

      // Client-side sorting if orderBy failed
      if (!options.sortBy || options.sortBy === 'createdAt') {
        listings.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return options.sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        });
      } else if (options.sortBy === 'price') {
        listings.sort((a, b) => {
          const aPrice = a.price || 0;
          const bPrice = b.price || 0;
          return options.sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
        });
      }

      return listings;
    } catch (error) {
      console.error('Error getting marketplace listings:', error);
      throw new Error(error.message || 'Failed to get marketplace listings');
    }
  }

  /**
   * Update a marketplace listing
   * @param {string} listingId - Listing document ID
   * @param {Object} updates - Update data
   * @param {Array} newImages - New image files to add (optional)
   * @returns {Promise<void>}
   */
  async update(listingId, updates, newImages = []) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!listingId) throw new Error('Listing ID is required');

      const listingRef = doc(db, MARKETPLACE_COLLECTION, listingId);
      const listingSnap = await getDoc(listingRef);

      if (!listingSnap.exists()) {
        throw new Error('Listing not found');
      }

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Upload new images if provided
      if (newImages && newImages.length > 0) {
        const newImageURLs = await this.uploadImages(listingId, newImages);
        const existingImages = listingSnap.data().images || [];
        updateData.images = [...existingImages, ...newImageURLs];
        if (!updateData.coverImage && newImageURLs.length > 0) {
          updateData.coverImage = newImageURLs[0];
        }
      }

      await updateDoc(listingRef, updateData);
    } catch (error) {
      console.error('Error updating marketplace listing:', error);
      throw new Error(error.message || 'Failed to update marketplace listing');
    }
  }

  /**
   * Delete a marketplace listing
   * @param {string} listingId - Listing document ID
   * @returns {Promise<void>}
   */
  async delete(listingId) {
    try {
      if (!db || !storage) {
        throw new Error('Firebase services are not initialized');
      }

      if (!listingId) throw new Error('Listing ID is required');

      const listingRef = doc(db, MARKETPLACE_COLLECTION, listingId);
      const listingSnap = await getDoc(listingRef);

      if (!listingSnap.exists()) {
        throw new Error('Listing not found');
      }

      // Delete images from storage
      const listingData = listingSnap.data();
      if (listingData.images && listingData.images.length > 0) {
        try {
          await this.deleteImages(listingId);
        } catch (storageError) {
          console.error('Error deleting images from storage:', storageError);
          // Continue with document deletion even if image deletion fails
        }
      }

      // Delete listing document
      await deleteDoc(listingRef);
    } catch (error) {
      console.error('Error deleting marketplace listing:', error);
      throw new Error(error.message || 'Failed to delete marketplace listing');
    }
  }

  /**
   * Upload images for a listing
   * @param {string} listingId - Listing document ID
   * @param {Array} images - Array of image files
   * @returns {Promise<Array>} - Array of download URLs
   */
  async uploadImages(listingId, images) {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      const uploadPromises = images.map(async (image, index) => {
        if (!(image instanceof File)) {
          throw new Error(`Invalid image file at index ${index}`);
        }

        const fileName = `${Date.now()}_${index}_${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const imageRef = storageRef(storage, `marketplace/${listingId}/${fileName}`);

        await uploadBytes(imageRef, image);
        return getDownloadURL(imageRef);
      });

      return Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error(error.message || 'Failed to upload images');
    }
  }

  /**
   * Delete all images for a listing
   * @param {string} listingId - Listing document ID
   * @returns {Promise<void>}
   */
  async deleteImages(listingId) {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      const folderRef = storageRef(storage, `marketplace/${listingId}`);
      const listResult = await listAll(folderRef);

      const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting images:', error);
      throw new Error(error.message || 'Failed to delete images');
    }
  }

  /**
   * Create an offer for a marketplace listing
   * @param {Object} offerData - Offer data
   * @returns {Promise<string>} - Offer document ID
   */
  async createOffer(offerData) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requiredFields = ['listingId', 'buyerId', 'offerAmount'];
      const missingFields = requiredFields.filter((field) => !offerData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const offerRef = await addDoc(collection(db, OFFERS_COLLECTION), {
        listingId: offerData.listingId,
        buyerId: offerData.buyerId,
        buyerName: offerData.buyerName || null,
        offerAmount: Number(offerData.offerAmount),
        message: offerData.message?.trim() || '',
        status: 'pending', // 'pending', 'accepted', 'rejected', 'withdrawn'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return offerRef.id;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new Error(error.message || 'Failed to create offer');
    }
  }

  /**
   * Get offers for a listing
   * @param {string} listingId - Listing document ID
   * @returns {Promise<Array>} - Array of offers
   */
  async getOffersByListing(listingId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const offersQuery = query(
        collection(db, OFFERS_COLLECTION),
        where('listingId', '==', listingId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting offers:', error);
      throw new Error(error.message || 'Failed to get offers');
    }
  }

  /**
   * Get offers by buyer
   * @param {string} buyerId - Buyer user ID
   * @returns {Promise<Array>} - Array of offers
   */
  async getOffersByBuyer(buyerId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const offersQuery = query(
        collection(db, OFFERS_COLLECTION),
        where('buyerId', '==', buyerId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting buyer offers:', error);
      throw new Error(error.message || 'Failed to get buyer offers');
    }
  }

  /**
   * Get offers by seller (all offers for seller's listings)
   * @param {string} sellerId - Seller user ID
   * @returns {Promise<Array>} - Array of offers with listing data
   */
  async getOffersBySeller(sellerId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // First get all seller's listings
      const listingsQuery = query(
        collection(db, MARKETPLACE_COLLECTION),
        where('sellerId', '==', sellerId)
      );
      const listingsSnapshot = await getDocs(listingsQuery);
      const listingIds = listingsSnapshot.docs.map((doc) => doc.id);

      if (listingIds.length === 0) {
        return [];
      }

      // Get all offers for these listings
      const offersPromises = listingIds.map((listingId) =>
        this.getOffersByListing(listingId)
      );
      const offersArrays = await Promise.all(offersPromises);
      const allOffers = offersArrays.flat();

      // Add listing data to each offer
      const offersWithListings = await Promise.all(
        allOffers.map(async (offer) => {
          try {
            const listing = await this.getById(offer.listingId, false);
            return { ...offer, listing };
          } catch (error) {
            console.error('Error loading listing for offer:', error);
            return { ...offer, listing: null };
          }
        })
      );

      return offersWithListings;
    } catch (error) {
      console.error('Error getting seller offers:', error);
      throw new Error(error.message || 'Failed to get seller offers');
    }
  }

  /**
   * Update offer status
   * @param {string} offerId - Offer document ID
   * @param {string} status - New status ('accepted', 'rejected', 'withdrawn')
   * @returns {Promise<void>}
   */
  async updateOfferStatus(offerId, status) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!['accepted', 'rejected', 'withdrawn'].includes(status)) {
        throw new Error('Invalid offer status');
      }

      const offerRef = doc(db, OFFERS_COLLECTION, offerId);
      await updateDoc(offerRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw new Error(error.message || 'Failed to update offer status');
    }
  }
}

export default new MarketplaceService();


