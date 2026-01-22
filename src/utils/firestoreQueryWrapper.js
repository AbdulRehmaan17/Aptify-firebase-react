/**
 * Firestore Query Wrapper
 * 
 * Standard wrapper for all Firestore queries that handles:
 * - failed-precondition (missing composite index) errors gracefully
 * - Permission errors
 * - Network errors
 * 
 * NEVER blocks navigation or crashes the UI
 * Always returns { data, error } instead of throwing
 */

import { query, collection, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Standard query result format
 * @typedef {Object} QueryResult
 * @property {Array} data - Array of documents (never null, always array)
 * @property {Error|null} error - Error object if query failed, null if successful
 * @property {boolean} usedFallback - Whether fallback query was used
 */

/**
 * Execute a Firestore query with graceful error handling
 * 
 * @param {string} collectionName - Collection name
 * @param {Array} whereClauses - Array of where() clauses
 * @param {Object} options - Query options
 * @param {string} options.orderByField - Field to order by
 * @param {string} options.orderDirection - 'asc' or 'desc'
 * @param {number} options.limitCount - Maximum documents to return
 * @param {Function} options.normalizeFn - Optional function to normalize each document
 * @returns {Promise<QueryResult>} - Query result with data and error
 */
export const executeQuery = async (collectionName, whereClauses = [], options = {}) => {
  const {
    orderByField = null,
    orderDirection = 'desc',
    limitCount = null,
    normalizeFn = null,
  } = options;

  // Validate db
  if (!db) {
    console.warn('⚠️ Firestore db not initialized - returning empty result');
    return { data: [], error: null, usedFallback: false };
  }

  // Helper to build and execute query
  const buildAndExecute = async (useOrderBy = true, useFilters = true) => {
    try {
      let q = collection(db, collectionName);

      // Apply where clauses if enabled
      if (useFilters && whereClauses.length > 0) {
        q = query(q, ...whereClauses);
      }

      // Apply orderBy if enabled
      if (useOrderBy && orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      } else {
        // Default limit to prevent fetching too many documents
        q = query(q, limit(100));
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply normalization if provided
      if (normalizeFn && typeof normalizeFn === 'function') {
        results = await Promise.all(results.map(normalizeFn));
      }

      return results;
    } catch (error) {
      throw error;
    }
  };

  // Try primary query
  try {
    const results = await buildAndExecute(true, true);
    return { data: results, error: null, usedFallback: false };
  } catch (primaryError) {
    // Handle failed-precondition (missing index)
    if (primaryError.code === 'failed-precondition' || primaryError.message?.includes('index')) {
      // Extract index creation URL if available
      const indexUrlMatch = primaryError.message?.match(/https?:\/\/[^\s]+/);
      if (indexUrlMatch) {
        console.warn('📊 INDEX REQUIRED - Firestore composite index needed');
        console.warn('   🔗 Index creation URL:', indexUrlMatch[0]);
        console.warn('   → Click the link above to create the required index in Firebase Console');
      } else {
        console.warn('📊 INDEX REQUIRED - Create a Firestore composite index');
        console.warn('   → Check Firebase Console for index creation prompts');
      }
      console.warn('   ⚠️  App will continue with fallback query (no orderBy, then no filters)');

      // FALLBACK 1: Try without orderBy (keep filters)
      try {
        console.log(`🔄 Fallback 1: Querying ${collectionName} without orderBy...`);
        const results = await buildAndExecute(false, true);
        
        // Sort client-side if orderBy was requested
        if (orderByField && results.length > 0) {
          results.sort((a, b) => {
            let aVal = a[orderByField];
            let bVal = b[orderByField];
            
            // Handle Firestore Timestamps
            if (aVal?.toMillis) aVal = aVal.toMillis();
            else if (aVal?.seconds) aVal = aVal.seconds;
            else if (aVal?.toDate) aVal = aVal.toDate().getTime();
            
            if (bVal?.toMillis) bVal = bVal.toMillis();
            else if (bVal?.seconds) bVal = bVal.seconds;
            else if (bVal?.toDate) bVal = bVal.toDate().getTime();
            
            const comparison = orderDirection === 'desc' 
              ? (bVal || 0) - (aVal || 0)
              : (aVal || 0) - (bVal || 0);
            
            return comparison;
          });
        }
        
        console.log(`✅ Fallback 1 successful: ${results.length} documents`);
        return { data: results, error: null, usedFallback: true };
      } catch (fallback1Error) {
        // FALLBACK 2: Try without filters (only limit)
        if (fallback1Error.code === 'failed-precondition' || fallback1Error.message?.includes('index')) {
          try {
            console.log(`🔄 Fallback 2: Querying ${collectionName} without filters...`);
            const results = await buildAndExecute(false, false);
            
            // Apply filters client-side
            let filtered = results;
            if (whereClauses.length > 0) {
              whereClauses.forEach((whereClause) => {
                const field = whereClause._fieldPath?.path || whereClause._delegate?.field?.path;
                const operator = whereClause._op || whereClause._delegate?.op;
                const value = whereClause._value || whereClause._delegate?.value?.value;
                
                if (field && operator && value !== undefined) {
                  filtered = filtered.filter((doc) => {
                    const docValue = getNestedValue(doc, field);
                    
                    switch (operator) {
                      case '==':
                        return docValue === value;
                      case '!=':
                        return docValue !== value;
                      case '>':
                        return docValue > value;
                      case '>=':
                        return docValue >= value;
                      case '<':
                        return docValue < value;
                      case '<=':
                        return docValue <= value;
                      case 'array-contains':
                        return Array.isArray(docValue) && docValue.includes(value);
                      default:
                        return true;
                    }
                  });
                }
              });
            }
            
            // Sort client-side if orderBy was requested
            if (orderByField && filtered.length > 0) {
              filtered.sort((a, b) => {
                let aVal = getNestedValue(a, orderByField);
                let bVal = getNestedValue(b, orderByField);
                
                // Handle Firestore Timestamps
                if (aVal?.toMillis) aVal = aVal.toMillis();
                else if (aVal?.seconds) aVal = aVal.seconds;
                else if (aVal?.toDate) aVal = aVal.toDate().getTime();
                
                if (bVal?.toMillis) bVal = bVal.toMillis();
                else if (bVal?.seconds) bVal = bVal.seconds;
                else if (bVal?.toDate) bVal = bVal.toDate().getTime();
                
                const comparison = orderDirection === 'desc' 
                  ? (bVal || 0) - (aVal || 0)
                  : (aVal || 0) - (bVal || 0);
                
                return comparison;
              });
            }
            
            // Apply limit after filtering
            if (limitCount && filtered.length > limitCount) {
              filtered = filtered.slice(0, limitCount);
            }
            
            console.log(`✅ Fallback 2 successful: ${filtered.length} documents (after client-side filtering)`);
            return { data: filtered, error: null, usedFallback: true };
          } catch (fallback2Error) {
            // Both fallbacks failed - return empty array (don't crash)
            console.warn(`⚠️  Both fallbacks failed for ${collectionName} - returning empty array`);
            console.warn('   Error:', fallback2Error.message);
            return { data: [], error: null, usedFallback: true };
          }
        } else {
          // Non-index error in fallback 1 - return empty array
          console.warn(`⚠️  Fallback 1 failed for ${collectionName} - returning empty array`);
          console.warn('   Error:', fallback1Error.message);
          return { data: [], error: null, usedFallback: true };
        }
      }
    } else if (primaryError.code === 'permission-denied') {
      // Permission error - log but don't crash
      console.warn('🔒 PERMISSION DENIED - Check Firestore security rules');
      console.warn('   Collection:', collectionName);
      return { data: [], error: null, usedFallback: false };
    } else {
      // Other errors - return empty array (don't crash)
      console.warn(`⚠️  Query failed for ${collectionName} - returning empty array`);
      console.warn('   Error:', primaryError.message);
      return { data: [], error: null, usedFallback: false };
    }
  }
};

/**
 * Helper to get nested value from object (e.g., "address.city")
 */
const getNestedValue = (obj, path) => {
  const parts = path.split('.');
  let value = obj;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
};

/**
 * Create where clause helper
 * @param {string} field - Field path (supports nested, e.g., "address.city")
 * @param {string} operator - Comparison operator
 * @param {*} value - Value to compare
 * @returns {Query} - Where clause
 */
export const createWhere = (field, operator, value) => {
  return where(field, operator, value);
};

/**
 * Simplified query function for common use cases
 * 
 * @param {string} collectionName - Collection name
 * @param {Object} filters - Filter object (e.g., { userId: '123', status: 'active' })
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryCollection = async (collectionName, filters = {}, options = {}) => {
  const whereClauses = [];
  
  // Build where clauses from filters object
  Object.entries(filters).forEach(([field, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      whereClauses.push(where(field, '==', value));
    }
  });
  
  return executeQuery(collectionName, whereClauses, options);
};





