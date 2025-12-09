/**
 * Safe Firestore Query Wrapper
 * Wraps all Firestore operations with error handling and rule compliance checks
 */

import { db, auth } from '../firebase';

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return auth && auth.currentUser !== null;
};

/**
 * Get current user UID
 */
export const getCurrentUserId = () => {
  if (!isAuthenticated()) {
    return null;
  }
  return auth.currentUser.uid;
};

/**
 * Safe Firestore query wrapper
 * Handles errors gracefully and returns empty array on permission denied
 */
export const safeQuery = async (queryFn, fallbackValue = []) => {
  try {
    if (!db) {
      console.warn('Firestore db is not initialized');
      return fallbackValue;
    }
    return await queryFn();
  } catch (error) {
    console.error('Firestore query error:', error);
    
    if (error.code === 'permission-denied') {
      console.warn('Permission denied - query violates Firestore rules');
      return fallbackValue;
    }
    
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      console.warn('Firestore unavailable - network error');
      return fallbackValue;
    }
    
    // Re-throw unexpected errors
    throw error;
  }
};

/**
 * Safe getDoc wrapper
 */
export const safeGetDoc = async (docRef, fallbackValue = null) => {
  try {
    if (!db) {
      console.warn('Firestore db is not initialized');
      return fallbackValue;
    }
    const docSnap = await docRef;
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return fallbackValue;
  } catch (error) {
    console.error('Firestore getDoc error:', error);
    
    if (error.code === 'permission-denied') {
      console.warn('Permission denied - cannot read document');
      return fallbackValue;
    }
    
    return fallbackValue;
  }
};

/**
 * Safe getDocs wrapper
 */
export const safeGetDocs = async (queryFn, fallbackValue = []) => {
  try {
    if (!db) {
      console.warn('Firestore db is not initialized');
      return fallbackValue;
    }
    const snapshot = await queryFn();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Firestore getDocs error:', error);
    
    if (error.code === 'permission-denied') {
      console.warn('Permission denied - cannot read collection');
      return fallbackValue;
    }
    
    return fallbackValue;
  }
};

/**
 * Check if collection is allowed by Firestore rules
 */
export const isCollectionAllowed = (collectionName) => {
  const allowedCollections = [
    'properties',
    'rentalListings',
    'userProfiles',
    'users',
    'notifications',
    'savedProperties',
  ];
  return allowedCollections.includes(collectionName);
};

/**
 * Warn about blocked collections
 */
export const warnBlockedCollection = (collectionName) => {
  console.warn(
    `⚠️ Collection "${collectionName}" is not allowed by Firestore rules. ` +
    `Only these collections are allowed: properties, rentalListings, userProfiles, users, notifications, savedProperties`
  );
};


