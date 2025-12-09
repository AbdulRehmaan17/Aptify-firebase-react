/**
 * Firestore Diagnostics Tool
 * Run this in browser console to diagnose Firestore connection issues
 */

import { db, auth } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export const runFirestoreDiagnostics = async () => {
  console.group('🔍 Firestore Diagnostics');
  
  const diagnostics = {
    firebaseInitialized: false,
    dbInitialized: false,
    authInitialized: false,
    userAuthenticated: false,
    userId: null,
    testQueries: {},
    errors: []
  };

  try {
    // 1. Check Firebase initialization
    console.log('1️⃣ Checking Firebase initialization...');
    if (!db) {
      diagnostics.errors.push('❌ Firestore db is not initialized');
      console.error('❌ Firestore db is null or undefined');
      console.log('💡 Check: Is Firebase config correct? Are environment variables set?');
    } else {
      diagnostics.dbInitialized = true;
      console.log('✅ Firestore db is initialized');
    }

    // 2. Check Auth initialization
    if (!auth) {
      diagnostics.errors.push('❌ Firebase auth is not initialized');
      console.error('❌ Firebase auth is null or undefined');
    } else {
      diagnostics.authInitialized = true;
      console.log('✅ Firebase auth is initialized');
    }

    // 3. Check user authentication
    console.log('2️⃣ Checking user authentication...');
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      diagnostics.errors.push('⚠️ User is not authenticated');
      console.warn('⚠️ No user is currently authenticated');
      console.log('💡 Most Firestore queries require authentication. Please log in.');
    } else {
      diagnostics.userAuthenticated = true;
      diagnostics.userId = currentUser.uid;
      console.log('✅ User is authenticated:', currentUser.uid);
      console.log('   Email:', currentUser.email);
    }

    // 4. Test basic queries (only if db is initialized)
    if (db) {
      console.log('3️⃣ Testing Firestore queries...');
      
      // Test 1: Properties collection (public read)
      try {
        console.log('   Testing properties collection (public read)...');
        const propertiesQuery = query(collection(db, 'properties'), limit(1));
        const propertiesSnapshot = await getDocs(propertiesQuery);
        diagnostics.testQueries.properties = {
          success: true,
          count: propertiesSnapshot.size,
          error: null
        };
        console.log('   ✅ Properties query successful:', propertiesSnapshot.size, 'documents');
      } catch (error) {
        diagnostics.testQueries.properties = {
          success: false,
          count: 0,
          error: error.message,
          code: error.code
        };
        diagnostics.errors.push(`Properties query failed: ${error.message}`);
        console.error('   ❌ Properties query failed:', error.message);
        console.error('   Error code:', error.code);
        
        if (error.code === 'permission-denied') {
          console.error('   💡 Permission denied! Check Firestore rules for properties collection.');
        }
        if (error.code === 'failed-precondition') {
          console.error('   💡 Index missing! Create the required Firestore index.');
        }
      }

      // Test 2: Users collection (requires auth)
      if (currentUser) {
        try {
          console.log('   Testing users collection (requires auth)...');
          const usersQuery = query(collection(db, 'users'), limit(1));
          const usersSnapshot = await getDocs(usersQuery);
          diagnostics.testQueries.users = {
            success: true,
            count: usersSnapshot.size,
            error: null
          };
          console.log('   ✅ Users query successful:', usersSnapshot.size, 'documents');
        } catch (error) {
          diagnostics.testQueries.users = {
            success: false,
            count: 0,
            error: error.message,
            code: error.code
          };
          diagnostics.errors.push(`Users query failed: ${error.message}`);
          console.error('   ❌ Users query failed:', error.message);
          console.error('   Error code:', error.code);
        }
      } else {
        console.log('   ⏭️ Skipping users query (not authenticated)');
      }

      // Test 3: Service Providers collection
      try {
        console.log('   Testing serviceProviders collection...');
        const providersQuery = query(collection(db, 'serviceProviders'), limit(1));
        const providersSnapshot = await getDocs(providersQuery);
        diagnostics.testQueries.serviceProviders = {
          success: true,
          count: providersSnapshot.size,
          error: null
        };
        console.log('   ✅ ServiceProviders query successful:', providersSnapshot.size, 'documents');
      } catch (error) {
        diagnostics.testQueries.serviceProviders = {
          success: false,
          count: 0,
          error: error.message,
          code: error.code
        };
        diagnostics.errors.push(`ServiceProviders query failed: ${error.message}`);
        console.error('   ❌ ServiceProviders query failed:', error.message);
        console.error('   Error code:', error.code);
      }
    }

    // 5. Summary
    console.log('4️⃣ Diagnostic Summary:');
    console.log('   Firebase Initialized:', diagnostics.dbInitialized && diagnostics.authInitialized);
    console.log('   User Authenticated:', diagnostics.userAuthenticated);
    console.log('   Test Queries Passed:', Object.values(diagnostics.testQueries).filter(q => q.success).length);
    console.log('   Total Errors:', diagnostics.errors.length);

    if (diagnostics.errors.length > 0) {
      console.group('❌ Errors Found:');
      diagnostics.errors.forEach((error, index) => {
        console.error(`${index + 1}. ${error}`);
      });
      console.groupEnd();
    } else {
      console.log('✅ No errors found!');
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    diagnostics.errors.push(`Diagnostic error: ${error.message}`);
  }

  console.groupEnd();
  return diagnostics;
};

// Auto-run diagnostics if in development
if (import.meta.env.DEV) {
  // Make it available globally for manual testing
  window.runFirestoreDiagnostics = runFirestoreDiagnostics;
  console.log('💡 Run diagnostics: window.runFirestoreDiagnostics()');
}

export default runFirestoreDiagnostics;

