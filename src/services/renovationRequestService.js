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
import { db } from '../firebase';
import notificationService from './notificationService';
import { getOrCreateChat } from '../utils/chatHelpers';

const RENOVATION_REQUESTS_COLLECTION = 'renovationRequests';

/**
 * Renovation Request Service
 * Handles renovation request operations
 */
class RenovationRequestService {
  /**
   * Create a renovation request
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
        providerId: requestData.providerId || null, // Optional - can be assigned later
        propertyId: requestData.propertyId || null, // Optional
        serviceCategory: requestData.serviceCategory,
        detailedDescription: requestData.detailedDescription || requestData.description,
        budget: Number(requestData.budget),
        preferredDate: requestData.preferredDate || requestData.startDate,
        photos: requestData.photos || [], // Array of photo URLs
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, RENOVATION_REQUESTS_COLLECTION), request);
      
      // Auto-create chat if provider is selected
      let chatId = null;
      if (requestData.providerId) {
        try {
          chatId = await getOrCreateChat(requestData.userId, requestData.providerId);
        } catch (chatError) {
          console.error('Error creating chat on request:', chatError);
          // Don't fail the request if chat creation fails
        }
      }

      // Send notifications
      try {
        // Notify user (confirmation)
        await notificationService.sendNotification(
          requestData.userId,
          'Renovation Request Submitted',
          `Your ${requestData.serviceCategory} request has been submitted successfully. We'll notify you when a provider responds.`,
          'service-request',
          '/dashboard'
        );

        // Notify provider if one was selected
        if (requestData.providerId) {
          await notificationService.sendNotification(
            requestData.providerId,
            'New Renovation Request',
            `You have received a new ${requestData.serviceCategory} request. Check your dashboard for details.`,
            'service-request',
            chatId ? `/chats?chatId=${chatId}` : '/provider-renovation-panel'
          );
        } else {
          // Notify all approved renovation providers
          const providersQuery = query(
            collection(db, 'providers'),
            where('type', '==', 'renovation'),
            where('isApproved', '==', true)
          );
          const providersSnapshot = await getDocs(providersQuery);
          
          const notificationPromises = providersSnapshot.docs.map((providerDoc) => {
            const providerData = providerDoc.data();
            if (providerData.userId) {
              return notificationService.sendNotification(
                providerData.userId,
                'New Renovation Request Available',
                `A new ${requestData.serviceCategory} request is available. Check available projects.`,
                'service-request',
                '/provider-renovation-panel'
              );
            }
            return Promise.resolve();
          });
          
          await Promise.allSettled(notificationPromises);
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the request if notifications fail
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating renovation request:', error);
      throw new Error(error.message || 'Failed to create renovation request');
    }
  }

  /**
   * Get renovation request by ID
   * @param {string} requestId - Request document ID
   * @returns {Promise<Object>} - Request data
   */
  async getById(requestId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, RENOVATION_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Renovation request not found');
      }

      return { id: requestSnap.id, ...requestSnap.data() };
    } catch (error) {
      console.error('Error fetching renovation request:', error);
      throw new Error(error.message || 'Failed to fetch renovation request');
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
        collection(db, RENOVATION_REQUESTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user renovation requests:', error);
      throw new Error(error.message || 'Failed to fetch renovation requests');
    }
  }

  /**
   * Get requests for provider (incoming requests)
   * @param {string} providerId - Provider user UID
   * @returns {Promise<Array>} - Array of requests
   */
  async getByProvider(providerId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Get requests assigned to this provider OR pending requests (no provider assigned)
      const assignedQuery = query(
        collection(db, RENOVATION_REQUESTS_COLLECTION),
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      const pendingQuery = query(
        collection(db, RENOVATION_REQUESTS_COLLECTION),
        where('providerId', '==', null),
        where('status', '==', 'Pending'),
        orderBy('createdAt', 'desc')
      );

      const [assignedSnapshot, pendingSnapshot] = await Promise.all([
        getDocs(assignedQuery),
        getDocs(pendingQuery),
      ]);

      const assigned = assignedSnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        isAssigned: true 
      }));
      
      const pending = pendingSnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        isAssigned: false 
      }));

      // Combine and sort by createdAt
      const all = [...assigned, ...pending].sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      return all;
    } catch (error) {
      console.error('Error fetching provider renovation requests:', error);
      throw new Error(error.message || 'Failed to fetch renovation requests');
    }
  }

  /**
   * Update request status (accept/reject/complete/update progress)
   * @param {string} requestId - Request document ID
   * @param {string} status - New status: 'Accepted', 'Rejected', 'Completed', 'In Progress'
   * @param {string} providerId - Provider user UID (for accepting)
   * @param {string} progressNote - Optional progress note for status updates
   * @returns {Promise<void>}
   */
  async updateStatus(requestId, status, providerId = null, progressNote = null) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, RENOVATION_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Renovation request not found');
      }

      const requestData = requestSnap.data();
      const userId = requestData.userId;
      const currentProviderId = requestData.providerId;

      // Prepare update data
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
      };

      // If accepting and providerId is provided, assign the provider
      if (status === 'Accepted' && providerId) {
        updateData.providerId = providerId;
        
        // Auto-create chat between user and provider
        try {
          const chatId = await getOrCreateChat(userId, providerId);
          updateData.chatId = chatId;
        } catch (chatError) {
          console.error('Error creating chat on accept:', chatError);
          // Don't fail the accept action if chat creation fails
        }
      }

      // Add progress note if provided
      if (progressNote) {
        updateData.progressNote = progressNote;
        updateData.lastProgressUpdate = serverTimestamp();
      }

      await updateDoc(requestRef, updateData);

      // Send notifications
      try {
        if (status === 'Accepted') {
          await notificationService.sendNotification(
            userId,
            'Renovation Request Accepted',
            `Your ${requestData.serviceCategory} request has been accepted! You can now chat with the provider.`,
            'success',
            updateData.chatId ? `/chats?chatId=${updateData.chatId}` : '/dashboard'
          );
        } else if (status === 'Rejected') {
          await notificationService.sendNotification(
            userId,
            'Renovation Request Rejected',
            `Your ${requestData.serviceCategory} request has been rejected.`,
            'info',
            '/dashboard'
          );
        } else if (status === 'Completed') {
          await notificationService.sendNotification(
            userId,
            'Renovation Project Completed',
            `Your ${requestData.serviceCategory} project has been marked as completed.`,
            'success',
            '/dashboard'
          );
        } else if (status === 'In Progress') {
          await notificationService.sendNotification(
            userId,
            'Renovation Project Started',
            progressNote 
              ? `Your ${requestData.serviceCategory} project is now in progress. ${progressNote}`
              : `Your ${requestData.serviceCategory} project is now in progress.`,
            'info',
            '/dashboard'
          );
        }
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    } catch (error) {
      console.error('Error updating renovation request status:', error);
      throw new Error(error.message || 'Failed to update renovation request');
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

      const requestRef = doc(db, RENOVATION_REQUESTS_COLLECTION, requestId);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Error deleting renovation request:', error);
      throw new Error(error.message || 'Failed to delete renovation request');
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
        collection(db, RENOVATION_REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching all renovation requests:', error);
      throw new Error(error.message || 'Failed to fetch renovation requests');
    }
  }
}

export default new RenovationRequestService();


