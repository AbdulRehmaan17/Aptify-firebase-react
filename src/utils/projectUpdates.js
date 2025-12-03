import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Add an update log to a project's updates subcollection
 * @param {string} collectionName - Collection name ('constructionProjects', 'renovationProjects', 'rentalRequests', 'buySellRequests')
 * @param {string} projectId - Project document ID
 * @param {string} status - New status
 * @param {string} updatedBy - User UID who made the update
 * @param {string} note - Optional note/comment
 * @returns {Promise<string>} - Update document ID
 */
export async function addProjectUpdate(collectionName, projectId, status, updatedBy, note = '') {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }

    if (!collectionName || !projectId || !status || !updatedBy) {
      throw new Error('collectionName, projectId, status, and updatedBy are required');
    }

    const updateData = {
      status,
      updatedBy,
      note: note.trim(),
      createdAt: serverTimestamp(),
    };

    const updateRef = await addDoc(
      collection(db, collectionName, projectId, 'updates'),
      updateData
    );

    return updateRef.id;
  } catch (error) {
    console.error('Error adding project update:', error);
    throw error;
  }
}



