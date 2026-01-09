import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase'; // AUTO-FIXED: Added auth import for rule compliance

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Notification Service
 * Handles creating and managing notifications
 * AUTO-FIXED: All methods comply with Firestore security rules
 */
class NotificationService {
  /**
   * Create a notification
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} userId - Target user UID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'service-request', 'admin', 'system', 'status-update', 'info', 'success', 'warning', 'error'
   * @param {string} link - Optional link URL
   * @returns {Promise<string>} - Notification document ID
   */
  async create(userId, title, message, type = 'info', link = null) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to create notifications');
      }

      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!userId || !title || !message) {
        throw new Error('userId, title, and message are required');
      }

      const notificationData = {
        userId,
        title,
        message,
        type,
        read: false,
        link,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error(error.message || 'Failed to create notification');
    }
  }

  /**
   * Send notification (alias for create)
   * @param {string} userId - Target user UID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {string} link - Optional link URL
   * @returns {Promise<string>} - Notification document ID
   */
  async sendNotification(userId, title, message, type = 'info', link = null) {
    return this.create(userId, title, message, type, link);
  }

  /**
   * Broadcast notification to all users (admin only)
   * AUTO-FIXED: Disabled - violates Firestore rules (users collection is owner-only)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {string} link - Optional link URL
   * @returns {Promise<void>}
   */
  async broadcast(title, message, type = 'info', link = null) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!title || !message) {
        throw new Error('title and message are required');
      }

      // AUTO-FIXED: Broadcast requires reading all users, which is not allowed by current Firestore rules
      // This function will fail with permission denied
      // For now, we'll return an error message
      console.warn('Broadcast notifications are not supported with current Firestore rules');
      throw new Error('Broadcast notifications require admin access. Please use create() to send individual notifications.');
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw new Error(error.message || 'Failed to broadcast notification');
    }
  }

  /**
   * Mark notification as read
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to update notifications');
      }

      if (!db || !notificationId) {
        throw new Error('Database and notification ID are required');
      }

      await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   * AUTO-FIXED: Requires authentication and filters by userId per Firestore rules
   * @param {string} userId - User UID
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to update notifications');
      }

      if (!db || !userId) {
        throw new Error('Database and user ID are required');
      }

      // AUTO-FIXED: Ensure user can only update their own notifications
      if (auth.currentUser.uid !== userId) {
        throw new Error('You can only mark your own notifications as read');
      }

      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(notificationsQuery);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  async delete(notificationId) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to delete notifications');
      }

      if (!db || !notificationId) {
        throw new Error('Database and notification ID are required');
      }

      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  /**
   * Clear all notifications for a user
   * AUTO-FIXED: Requires authentication and filters by userId per Firestore rules
   * @param {string} userId - User UID
   * @returns {Promise<void>}
   */
  async clearAll(userId) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        throw new Error('Authentication required to clear notifications');
      }

      if (!db || !userId) {
        throw new Error('Database and user ID are required');
      }

      // AUTO-FIXED: Ensure user can only clear their own notifications
      if (auth.currentUser.uid !== userId) {
        throw new Error('You can only clear your own notifications');
      }

      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(notificationsQuery);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw new Error(error.message || 'Failed to clear all notifications');
    }
  }

  /**
   * Get unread count for a user
   * AUTO-FIXED: Requires authentication and filters by userId per Firestore rules
   * @param {string} userId - User UID
   * @returns {Promise<number>} - Unread count
   */
  async getUnreadCount(userId) {
    try {
      // AUTO-FIXED: Check authentication per Firestore rules
      if (!auth || !auth.currentUser) {
        return 0;
      }

      if (!db || !userId) {
        return 0;
      }

      // AUTO-FIXED: Ensure user can only get their own unread count
      if (auth.currentUser.uid !== userId) {
        return 0;
      }

      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(notificationsQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0; // AUTO-FIXED: Safe fallback
    }
  }

  /**
   * Notify admin about new property listing
   * AUTO-FIXED: Disabled - violates Firestore rules (users collection is owner-only)
   * @param {string} propertyId - Property document ID
   * @param {string} propertyTitle - Property title
   * @param {string} ownerId - Owner user UID
   * @returns {Promise<void>}
   */
  async notifyAdminNewProperty(propertyId, propertyTitle, ownerId) {
    try {
      // AUTO-FIXED: Querying users collection requires owner-only access per Firestore rules
      // This function will fail with permission denied
      // For now, we'll log a warning and return silently
      console.warn('notifyAdminNewProperty: Cannot query users collection - requires owner-only access per Firestore rules');
      console.warn('To notify admins, you must know their user IDs and call create() directly');
      return;
    } catch (error) {
      console.error('Error notifying admin about new property:', error);
      // Don't throw - notification failure shouldn't break property creation
    }
  }

  /**
   * Notify user about property approval
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} userId - User UID
   * @param {string} propertyId - Property document ID
   * @param {string} propertyTitle - Property title
   * @returns {Promise<void>}
   */
  async notifyUserPropertyApproved(userId, propertyId, propertyTitle) {
    try {
      await this.create(
        userId,
        'Property Approved',
        `Your property "${propertyTitle}" has been approved and is now live!`,
        'success',
        `/properties/${propertyId}`
      );
    } catch (error) {
      console.error('Error notifying user about property approval:', error);
      // Don't throw - notification failure shouldn't break property approval
    }
  }

  /**
   * Notify provider when new construction request is assigned
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} providerId - Provider user UID
   * @param {string} projectId - Construction project document ID
   * @param {string} projectType - Type of construction project
   * @param {number} budget - Project budget
   * @returns {Promise<void>}
   */
  async notifyProviderNewRequest(providerId, projectId, projectType, budget) {
    try {
      const budgetFormatted = new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
      }).format(budget);

      await this.create(
        providerId,
        'New Construction Request Assigned',
        `You have been assigned a new ${projectType} project. Budget: ${budgetFormatted}`,
        'service-request',
        `/constructor/projects/${projectId}`
      );
    } catch (error) {
      console.error('Error notifying provider about new request:', error);
      // Don't throw - notification failure shouldn't break request assignment
    }
  }

  /**
   * Notify provider when client sends a message
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} providerId - Provider user UID
   * @param {string} clientName - Client name
   * @param {string} chatId - Chat document ID
   * @returns {Promise<void>}
   */
  async notifyProviderNewMessage(providerId, clientName, chatId) {
    try {
      await this.create(
        providerId,
        'New Message from Client',
        `${clientName} sent you a message`,
        'info',
        `/chat?chatId=${chatId}`
      );
    } catch (error) {
      console.error('Error notifying provider about new message:', error);
      // Don't throw - notification failure shouldn't break messaging
    }
  }

  /**
   * Notify provider when admin approves their profile
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} providerId - Provider user UID
   * @returns {Promise<void>}
   */
  async notifyProviderProfileApproved(providerId) {
    try {
      await this.create(
        providerId,
        'Profile Approved',
        'Your constructor profile has been approved by admin. You can now receive project requests!',
        'success',
        '/constructor/dashboard'
      );
    } catch (error) {
      console.error('Error notifying provider about profile approval:', error);
      // Don't throw - notification failure shouldn't break profile approval
    }
  }

  /**
   * Notify client when provider updates project status
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} clientId - Client user UID
   * @param {string} projectId - Construction project document ID
   * @param {string} newStatus - New project status
   * @param {string} projectType - Type of construction project
   * @returns {Promise<void>}
   */
  async notifyClientStatusUpdate(clientId, projectId, newStatus, projectType) {
    try {
      // Map to valid routes based on project type
      const link = projectType === 'Construction' 
        ? `/construction/project/${projectId}`
        : `/renovation/my-renovations/${projectId}`;
      
      await this.create(
        clientId,
        'Project Status Updated',
        `Your ${projectType} project status has been updated to: ${newStatus}`,
        'status-update',
        link
      );
    } catch (error) {
      console.error('Error notifying client about status update:', error);
      // Don't throw - notification failure shouldn't break status update
    }
  }

  /**
   * Notify client when provider adds new project update
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} clientId - Client user UID
   * @param {string} projectId - Construction project document ID
   * @param {string} projectType - Type of construction project
   * @returns {Promise<void>}
   */
  async notifyClientNewUpdate(clientId, projectId, projectType) {
    try {
      // Map to valid routes based on project type
      const link = projectType === 'Construction' 
        ? `/construction/project/${projectId}`
        : `/renovation/my-renovations/${projectId}`;
      
      await this.create(
        clientId,
        'New Project Update',
        `Your ${projectType} project has a new update from the provider`,
        'info',
        link
      );
    } catch (error) {
      console.error('Error notifying client about new update:', error);
      // Don't throw - notification failure shouldn't break project updates
    }
  }

  /**
   * Notify client when provider sends a message
   * AUTO-FIXED: Requires authentication per Firestore rules
   * @param {string} clientId - Client user UID
   * @param {string} providerName - Provider name
   * @param {string} chatId - Chat document ID
   * @returns {Promise<void>}
   */
  async notifyClientNewMessage(clientId, providerName, chatId) {
    try {
      await this.create(
        clientId,
        'New Message from Provider',
        `${providerName} sent you a message`,
        'info',
        `/chat?chatId=${chatId}`
      );
    } catch (error) {
      console.error('Error notifying client about new message:', error);
      // Don't throw - notification failure shouldn't break messaging
    }
  }
}

// AUTO-FIXED: Clean export statement
export default new NotificationService();
