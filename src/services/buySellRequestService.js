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
  serverTimestamp,
} from 'firebase/firestore';
import propertyService from './propertyService';
import { db } from '../firebase/firebase';
import notificationService from './notificationService';

const BUY_SELL_REQUESTS_COLLECTION = 'buySellRequests';

/**
 * Buy/Sell Request Service
 * Handles buy/sell offer operations
 */
class BuySellRequestService {
  /**
   * Create a buy/sell request
   * @param {Object} requestData - Request data
   * @returns {Promise<string>} - Request document ID
   */
  async create(requestData) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const request = {
        userId: requestData.userId,
        propertyId: requestData.propertyId,
        offerAmount: Number(requestData.offerAmount),
        message: requestData.message || '',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, BUY_SELL_REQUESTS_COLLECTION), request);
      return docRef.id;
    } catch (error) {
      console.error('Error creating buy/sell request:', error);
      throw new Error(error.message || 'Failed to create buy/sell request');
    }
  }

  /**
   * Get buy/sell request by ID
   * @param {string} requestId - Request document ID
   * @returns {Promise<Object>} - Request data
   */
  async getById(requestId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, BUY_SELL_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Buy/sell request not found');
      }

      return { id: requestSnap.id, ...requestSnap.data() };
    } catch (error) {
      console.error('Error fetching buy/sell request:', error);
      throw new Error(error.message || 'Failed to fetch buy/sell request');
    }
  }

  /**
   * Get requests by user (sent by user)
   * @param {string} userId - User UID
   * @returns {Promise<Array>} - Array of requests
   */
  async getByUser(userId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const q = query(
        collection(db, BUY_SELL_REQUESTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user buy/sell requests:', error);
      throw new Error(error.message || 'Failed to fetch buy/sell requests');
    }
  }

  /**
   * Get requests for property owner
   * @param {string} propertyId - Property document ID
   * @returns {Promise<Array>} - Array of requests
   */
  async getByProperty(propertyId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const q = query(
        collection(db, BUY_SELL_REQUESTS_COLLECTION),
        where('propertyId', '==', propertyId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching property buy/sell requests:', error);
      throw new Error(error.message || 'Failed to fetch buy/sell requests');
    }
  }

  /**
   * Get all requests for owner (across all their properties)
   * @param {string} ownerId - Owner user UID
   * @returns {Promise<Array>} - Array of requests
   */
  async getByOwner(ownerId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Get all properties owned by this user using propertyService
      const properties = await propertyService.getAll({ ownerId }, {});
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return [];
      }

      // Get all requests for these properties
      const requests = [];
      for (const propertyId of propertyIds) {
        try {
          const propertyRequests = await this.getByProperty(propertyId);
          requests.push(...propertyRequests);
        } catch (error) {
          console.error(`Error fetching requests for property ${propertyId}:`, error);
        }
      }

      // Sort by createdAt descending
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      return requests;
    } catch (error) {
      console.error('Error fetching owner buy/sell requests:', error);
      throw new Error(error.message || 'Failed to fetch buy/sell requests');
    }
  }

  /**
   * Update request status
   * @param {string} requestId - Request document ID
   * @param {string} status - New status: 'Accepted', 'Rejected', 'Pending'
   * @param {string} propertyTitle - Property title for notification
   * @param {string} userId - User ID to notify
   * @returns {Promise<void>}
   */
  async updateStatus(requestId, status, propertyTitle, userId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, BUY_SELL_REQUESTS_COLLECTION, requestId);
      await updateDoc(requestRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      // Notify user
      if (status === 'Accepted') {
        await notificationService.create(
          userId,
          'Purchase Offer Accepted',
          `Your purchase offer for "${propertyTitle}" has been accepted!`,
          'success',
          `/account`
        );
      } else if (status === 'Rejected') {
        await notificationService.create(
          userId,
          'Purchase Offer Rejected',
          `Your purchase offer for "${propertyTitle}" has been rejected.`,
          'info',
          `/account`
        );
      }
    } catch (error) {
      console.error('Error updating buy/sell request status:', error);
      throw new Error(error.message || 'Failed to update buy/sell request');
    }
  }

  /**
   * Delete request
   * @param {string} requestId - Request document ID
   * @returns {Promise<void>}
   */
  async delete(requestId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, BUY_SELL_REQUESTS_COLLECTION, requestId);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Error deleting buy/sell request:', error);
      throw new Error(error.message || 'Failed to delete buy/sell request');
    }
  }

  /**
   * Get all requests (admin)
   * @returns {Promise<Array>} - Array of all requests
   */
  async getAll() {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const q = query(
        collection(db, BUY_SELL_REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching all buy/sell requests:', error);
      throw new Error(error.message || 'Failed to fetch buy/sell requests');
    }
  }
}

export default new BuySellRequestService();

