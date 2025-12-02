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
import { db } from '../firebase/firebase';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Notification Service
 * Handles creating and managing notifications
 */
class NotificationService {
  /**
   * Create a notification
   * @param {string} userId - Target user UID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'service-request', 'admin', 'system', 'status-update', 'info', 'success', 'warning', 'error'
   * @param {string} link - Optional link URL
   * @returns {Promise<string>} - Notification document ID
   */
  async create(userId, title, message, type = 'info', link = null) {
    try {
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

      // Get all users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        console.warn('No users found to broadcast to');
        return;
      }

      // Create notifications for all users using batch
      const batch = writeBatch(db);
      const notificationData = {
        title,
        message,
        type,
        read: false,
        link,
        createdAt: serverTimestamp(),
        isBroadcast: true,
      };

      usersSnapshot.docs.forEach((userDoc) => {
        const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
        batch.set(notificationRef, {
          ...notificationData,
          userId: userDoc.id,
        });
      });

      await batch.commit();
      console.log(`Broadcast notification sent to ${usersSnapshot.docs.length} users`);
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw new Error(error.message || 'Failed to broadcast notification');
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId) {
    try {
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
   * @param {string} userId - User UID
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    try {
      if (!db || !userId) {
        throw new Error('Database and user ID are required');
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
   * @param {string} notificationId - Notification document ID
   * @returns {Promise<void>}
   */
  async delete(notificationId) {
    try {
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
   * @param {string} userId - User UID
   * @returns {Promise<void>}
   */
  async clearAll(userId) {
    try {
      if (!db || !userId) {
        throw new Error('Database and user ID are required');
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
   * @param {string} userId - User UID
   * @returns {Promise<number>} - Unread count
   */
  async getUnreadCount(userId) {
    try {
      if (!db || !userId) {
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
      return 0;
    }
  }

  /**
   * Notify admin about new property listing
   * @param {string} propertyId - Property document ID
   * @param {string} propertyTitle - Property title
   * @param {string} ownerId - Owner user UID
   * @returns {Promise<void>}
   */
  async notifyAdminNewProperty(propertyId, propertyTitle, ownerId) {
    try {
      // Find all admin users
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminSnapshot = await getDocs(usersQuery);

      if (adminSnapshot.empty) {
        console.warn('No admin users found to notify');
        return;
      }

      // Create notification for each admin
      const notificationPromises = adminSnapshot.docs.map((adminDoc) => {
        const adminId = adminDoc.id;
        return this.create(
          adminId,
          'New Property Listing',
          `A new property "${propertyTitle}" has been submitted and is pending approval.`,
          'info',
          `/properties/${propertyId}`
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Notified ${adminSnapshot.docs.length} admin(s) about new property`);
    } catch (error) {
      console.error('Error notifying admin about new property:', error);
      // Don't throw - notification failure shouldn't break property creation
    }
  }

  /**
   * Notify user about property approval
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
    }
  }
}

export default new NotificationService();

