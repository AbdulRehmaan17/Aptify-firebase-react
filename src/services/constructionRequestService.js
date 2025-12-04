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

const CONSTRUCTION_REQUESTS_COLLECTION = 'constructionRequests';

/**
 * Construction Request Service
 * Handles construction request operations
 */
class ConstructionRequestService {
  /**
   * Create a construction request
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
        propertyId: requestData.propertyId || null, // Optional - null for new construction
        projectType: requestData.projectType,
        description: requestData.description,
        budget: Number(requestData.budget),
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, CONSTRUCTION_REQUESTS_COLLECTION), request);
      
      // Send notifications
      try {
        // Notify user (confirmation)
        await notificationService.sendNotification(
          requestData.userId,
          'Construction Request Submitted',
          `Your ${requestData.projectType} request has been submitted successfully. We'll notify you when a provider responds.`,
          'service-request',
          '/dashboard'
        );

        // Notify provider if one was selected
        if (requestData.providerId) {
          await notificationService.sendNotification(
            requestData.providerId,
            'New Construction Request',
            `You have received a new ${requestData.projectType} request. Check your dashboard for details.`,
            'service-request',
            '/provider-construction-panel'
          );
        } else {
          // Notify all approved construction providers
          const providersQuery = query(
            collection(db, 'providers'),
            where('type', '==', 'construction'),
            where('isApproved', '==', true)
          );
          const providersSnapshot = await getDocs(providersQuery);
          
          const notificationPromises = providersSnapshot.docs.map((providerDoc) => {
            const providerData = providerDoc.data();
            if (providerData.userId) {
              return notificationService.sendNotification(
                providerData.userId,
                'New Construction Request Available',
                `A new ${requestData.projectType} request is available. Check available projects.`,
                'service-request',
                '/provider-construction-panel'
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
      console.error('Error creating construction request:', error);
      throw new Error(error.message || 'Failed to create construction request');
    }
  }

  /**
   * Get construction request by ID
   * @param {string} requestId - Request document ID
   * @returns {Promise<Object>} - Request data
   */
  async getById(requestId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, CONSTRUCTION_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Construction request not found');
      }

      return { id: requestSnap.id, ...requestSnap.data() };
    } catch (error) {
      console.error('Error fetching construction request:', error);
      throw new Error(error.message || 'Failed to fetch construction request');
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
        collection(db, CONSTRUCTION_REQUESTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user construction requests:', error);
      throw new Error(error.message || 'Failed to fetch construction requests');
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
        collection(db, CONSTRUCTION_REQUESTS_COLLECTION),
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      const pendingQuery = query(
        collection(db, CONSTRUCTION_REQUESTS_COLLECTION),
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
      console.error('Error fetching provider construction requests:', error);
      throw new Error(error.message || 'Failed to fetch construction requests');
    }
  }

  /**
   * Update request status (accept/reject/complete)
   * @param {string} requestId - Request document ID
   * @param {string} status - New status: 'Accepted', 'Rejected', 'Completed', 'In Progress'
   * @param {string} providerId - Provider user UID (for accepting)
   * @returns {Promise<void>}
   */
  async updateStatus(requestId, status, providerId = null) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const requestRef = doc(db, CONSTRUCTION_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Construction request not found');
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

      await updateDoc(requestRef, updateData);

      // Send notifications
      try {
        if (status === 'Accepted') {
          await notificationService.sendNotification(
            userId,
            'Construction Request Accepted',
            `Your ${requestData.projectType} request has been accepted! You can now chat with the provider.`,
            'success',
            updateData.chatId ? `/chats?chatId=${updateData.chatId}` : '/dashboard'
          );
        } else if (status === 'Rejected') {
          await notificationService.sendNotification(
            userId,
            'Construction Request Rejected',
            `Your ${requestData.projectType} request has been rejected.`,
            'info',
            '/dashboard'
          );
        } else if (status === 'Completed') {
          await notificationService.sendNotification(
            userId,
            'Construction Project Completed',
            `Your ${requestData.projectType} project has been marked as completed.`,
            'success',
            '/dashboard'
          );
        } else if (status === 'In Progress') {
          await notificationService.sendNotification(
            userId,
            'Construction Project Started',
            `Your ${requestData.projectType} project is now in progress.`,
            'info',
            '/dashboard'
          );
        }
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    } catch (error) {
      console.error('Error updating construction request status:', error);
      throw new Error(error.message || 'Failed to update construction request');
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

      const requestRef = doc(db, CONSTRUCTION_REQUESTS_COLLECTION, requestId);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Error deleting construction request:', error);
      throw new Error(error.message || 'Failed to delete construction request');
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
        collection(db, CONSTRUCTION_REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching all construction requests:', error);
      throw new Error(error.message || 'Failed to fetch construction requests');
    }
  }
}

export default new ConstructionRequestService();


