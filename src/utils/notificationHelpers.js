import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

/**
 * Send a notification
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Target user UID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type (default: 'system')
 * @param {Object} params.meta - Additional metadata (optional)
 * @returns {Promise<string>} - Notification document ID
 */
export async function sendNotification({ userId, title, message, type = 'system', meta = {} }) {
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
      createdAt: serverTimestamp(),
      meta,
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  try {
    if (!db || !notificationId) {
      throw new Error('Database and notification ID are required');
    }

    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    toast.error('Failed to mark notification as read');
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User UID
 * @returns {Promise<void>}
 */
export async function markAllAsRead(userId) {
  try {
    if (!db || !userId) {
      throw new Error('Database and user ID are required');
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    if (snapshot.empty) {
      toast.success('All notifications are already read');
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        read: true,
        readAt: serverTimestamp(),
      });
    });

    await batch.commit();
    toast.success(`Marked ${snapshot.size} notification${snapshot.size !== 1 ? 's' : ''} as read`);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    toast.error('Failed to mark all notifications as read');
    throw error;
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  try {
    if (!db || !notificationId) {
      throw new Error('Database and notification ID are required');
    }

    await deleteDoc(doc(db, 'notifications', notificationId));
    toast.success('Notification deleted');
  } catch (error) {
    console.error('Error deleting notification:', error);
    toast.error('Failed to delete notification');
    throw error;
  }
}



