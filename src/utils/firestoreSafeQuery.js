/**
 * Safe Firestore Query Utility
 * 
 * Wraps Firestore queries with proper error handling and fallbacks
 * to prevent blank screens and permission errors
 */

/**
 * Collections allowed by Firestore rules
 */
export const ALLOWED_COLLECTIONS = [
  'properties',
  'rentalListings',
  'userProfiles',
  'users',
  'notifications',
  'savedProperties',
];

/**
 * Check if a collection is allowed by Firestore rules
 * @param {string} collectionName - Collection name to check
 * @returns {boolean} - True if collection is allowed
 */
export function isCollectionAllowed(collectionName) {
  return ALLOWED_COLLECTIONS.includes(collectionName);
}

/**
 * Safe query wrapper that handles permission errors gracefully
 * @param {string} collectionName - Collection name
 * @param {Function} queryFn - Query function to execute
 * @param {any} fallbackValue - Value to return on error (default: [])
 * @returns {Promise<any>} - Query result or fallback value
 */
export async function safeQuery(collectionName, queryFn, fallbackValue = []) {
  // Check if collection is blocked
  if (!isCollectionAllowed(collectionName)) {
    console.warn(`⚠️ Collection "${collectionName}" is blocked by Firestore rules. Returning fallback.`);
    return fallbackValue;
  }

  try {
    return await queryFn();
  } catch (error) {
    // Handle permission denied errors gracefully
    if (error.code === 'permission-denied') {
      console.warn(`⚠️ Permission denied for collection "${collectionName}". Returning fallback.`);
      return fallbackValue;
    }
    
    // Handle other errors
    console.error(`❌ Error querying collection "${collectionName}":`, error);
    return fallbackValue;
  }
}

/**
 * Safe onSnapshot wrapper that handles permission errors gracefully
 * @param {string} collectionName - Collection name
 * @param {Function} setupFn - Function that sets up the onSnapshot listener
 * @param {any} fallbackValue - Value to use on error (default: [])
 * @returns {Function} - Unsubscribe function or null
 */
export function safeOnSnapshot(collectionName, setupFn, fallbackValue = []) {
  // Check if collection is blocked
  if (!isCollectionAllowed(collectionName)) {
    console.warn(`⚠️ Collection "${collectionName}" is blocked by Firestore rules. Skipping listener.`);
    return () => {}; // Return no-op unsubscribe
  }

  try {
    return setupFn((snapshot) => {
      return snapshot;
    }, (error) => {
      // Handle permission denied errors gracefully
      if (error.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied for collection "${collectionName}". Using fallback.`);
        if (typeof fallbackValue === 'function') {
          fallbackValue([]);
        }
        return;
      }
      
      // Handle other errors
      console.error(`❌ Error in onSnapshot for collection "${collectionName}":`, error);
      if (typeof fallbackValue === 'function') {
        fallbackValue([]);
      }
    });
  } catch (error) {
    console.error(`❌ Error setting up onSnapshot for collection "${collectionName}":`, error);
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Check if user is authenticated before querying
 * @param {Object} auth - Firebase auth object
 * @returns {boolean} - True if user is authenticated
 */
export function requireAuth(auth) {
  if (!auth || !auth.currentUser) {
    console.warn('⚠️ User must be authenticated to access this collection');
    return false;
  }
  return true;
}

