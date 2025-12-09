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
import { db } from './firestore';

/**
 * Add a document to a collection with auto-generated ID
 * @param {string} collectionName - Name of the collection
 * @param {object} data - Document data
 * @returns {Promise<string>} - Document ID
 */
export const addDocAutoId = async (collectionName, data) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<object|null>} - Document data with id, or null if not found
 */
export const getDocById = async (collectionName, docId) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting document ${docId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateDocById = async (collectionName, docId, updates) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating document ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 */
export const deleteDocById = async (collectionName, docId) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetch documents from a collection with optional filters and sorting
 * @param {string} collectionName - Name of the collection
 * @param {object} options - Query options
 * @param {array} options.filters - Array of filter objects: { field, operator, value }
 * @param {string} options.orderByField - Field to order by
 * @param {string} options.orderDirection - 'asc' or 'desc'
 * @param {number} options.limitCount - Maximum number of documents to return
 * @returns {Promise<array>} - Array of documents with ids
 */
export const fetchCollection = async (collectionName, options = {}) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    let q = query(collection(db, collectionName));

    // Apply filters
    if (options.filters && Array.isArray(options.filters)) {
      options.filters.forEach((filter) => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          q = query(q, where(filter.field, filter.operator, filter.value));
        }
      });
    }

    // Apply sorting
    if (options.orderByField) {
      const direction = options.orderDirection || 'desc';
      q = query(q, orderBy(options.orderByField, direction));
    }

    // Apply limit
    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Check if a document exists
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<boolean>}
 */
export const docExists = async (collectionName, docId) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error(`Error checking document existence ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Batch update multiple documents
 * @param {array} updates - Array of { collectionName, docId, data } objects
 * @returns {Promise<void>}
 */
export const batchUpdate = async (updates) => {
  try {
    if (!db) {
      throw new Error('Database is not initialized');
    }

    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);

    updates.forEach(({ collectionName, docId, data }) => {
      const docRef = doc(db, collectionName, docId);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};
