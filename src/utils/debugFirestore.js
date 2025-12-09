/**
 * Debug Firestore Queries
 * Add this to any component to debug Firestore data fetching
 */

import { db } from '../firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export const debugFirestoreQuery = async (collectionName, filters = {}, options = {}) => {
  console.group(`🔍 Debugging Firestore Query: ${collectionName}`);
  
  try {
    // Check if db is initialized
    if (!db) {
      console.error('❌ Firestore db is not initialized!');
      console.log('Check: Is Firebase config correct? Are environment variables set?');
      return { error: 'Firestore not initialized', data: [] };
    }

    console.log('✅ Firestore db is initialized');
    console.log('📋 Query Parameters:', { collectionName, filters, options });

    // Build query
    let q = collection(db, collectionName);
    
    // Add filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
      console.log(`✅ Added filter: status == '${filters.status}'`);
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
      console.log(`✅ Added filter: type == '${filters.type}'`);
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
      console.log(`✅ Added limit: ${options.limit}`);
    }

    console.log('🚀 Executing query...');
    const snapshot = await getDocs(q);
    
    console.log(`✅ Query successful! Found ${snapshot.docs.length} documents`);
    
    const data = snapshot.docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
      };
    });

    if (data.length > 0) {
      console.log('📄 Sample document:', data[0]);
    } else {
      console.warn('⚠️ No documents found. Possible reasons:');
      console.warn('  1. Collection is empty');
      console.warn('  2. Filters are too restrictive');
      console.warn('  3. Firestore rules are blocking access');
      console.warn('  4. Collection name is incorrect');
    }

    console.groupEnd();
    return { error: null, data };
  } catch (error) {
    console.error('❌ Query failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);
    
    if (error.code === 'permission-denied') {
      console.error('🔒 PERMISSION DENIED - Check Firestore security rules!');
      console.error('   - Is user authenticated?');
      console.error('   - Do rules allow this query?');
      console.error('   - Is the collection name correct?');
    } else if (error.code === 'failed-precondition') {
      console.error('📊 INDEX REQUIRED - Create a Firestore index!');
      console.error('   - Check Firebase Console for index creation link');
      console.error('   - Or update firestore.indexes.json');
    } else if (error.message?.includes('index')) {
      console.error('📊 INDEX MISSING - Create a Firestore index!');
    }
    
    console.groupEnd();
    return { error: error.message, code: error.code, data: [] };
  }
};

// Helper to test properties collection
export const testPropertiesQuery = async () => {
  return await debugFirestoreQuery('properties', { status: 'published' }, { limit: 5 });
};

