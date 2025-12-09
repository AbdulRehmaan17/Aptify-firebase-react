/**
 * Blocked Collections Utility
 * 
 * With the new Firestore rules, many collections are blocked.
 * This utility provides helper functions to handle blocked collections gracefully.
 */

/**
 * Collections that are blocked by Firestore rules
 */
export const BLOCKED_COLLECTIONS = [
  'serviceProviders',
  'constructionProjects',
  'renovationProjects',
  'rentalRequests',
  'buySellRequests',
  'chats',
  'messages',
  'supportMessages',
  'supportChats',
  'reviews',
  'constructors',
  'renovators',
  'projectUpdates',
  'replies',
];

/**
 * Check if a collection is blocked
 * @param {string} collectionName - Collection name to check
 * @returns {boolean} - True if collection is blocked
 */
export function isCollectionBlocked(collectionName) {
  return BLOCKED_COLLECTIONS.includes(collectionName);
}

/**
 * Get a user-friendly error message for blocked collections
 * @param {string} collectionName - Collection name
 * @returns {string} - Error message
 */
export function getBlockedCollectionError(collectionName) {
  return `The "${collectionName}" collection is not available with current Firestore rules. This feature has been temporarily disabled.`;
}

/**
 * Safe query wrapper that checks if collection is blocked
 * @param {string} collectionName - Collection name
 * @param {Function} queryFn - Query function to execute
 * @returns {Promise<any>} - Query result or empty array/null
 */
export async function safeQuery(collectionName, queryFn) {
  if (isCollectionBlocked(collectionName)) {
    console.warn(`Query to blocked collection "${collectionName}" was prevented`);
    return [];
  }
  try {
    return await queryFn();
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.warn(`Permission denied for collection "${collectionName}"`);
      return [];
    }
    throw error;
  }
}

