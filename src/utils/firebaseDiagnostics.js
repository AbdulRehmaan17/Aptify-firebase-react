/**
 * Firebase Diagnostics Utility
 * Helps diagnose Firestore connection and data fetching issues
 */

import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { auth } from '../firebase';

export const runDiagnostics = async () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    firebase: {},
    firestore: {},
    auth: {},
    tests: [],
    errors: [],
  };

  // 1. Check Firebase App Initialization
  try {
    const { app } = await import('../firebase/config');
    diagnostics.firebase.appInitialized = !!app;
    diagnostics.firebase.appName = app?.name || 'Not initialized';
    diagnostics.tests.push({
      name: 'Firebase App',
      status: app ? 'PASS' : 'FAIL',
      message: app ? 'Firebase app is initialized' : 'Firebase app is NOT initialized',
    });
  } catch (error) {
    diagnostics.firebase.appInitialized = false;
    diagnostics.errors.push(`Firebase App Error: ${error.message}`);
    diagnostics.tests.push({
      name: 'Firebase App',
      status: 'FAIL',
      message: error.message,
    });
  }

  // 2. Check Firestore Database
  try {
    diagnostics.firestore.dbInitialized = !!db;
    diagnostics.firestore.dbName = db?.app?.name || 'Not initialized';
    diagnostics.tests.push({
      name: 'Firestore DB',
      status: db ? 'PASS' : 'FAIL',
      message: db ? 'Firestore database is initialized' : 'Firestore database is NOT initialized',
    });
  } catch (error) {
    diagnostics.firestore.dbInitialized = false;
    diagnostics.errors.push(`Firestore DB Error: ${error.message}`);
    diagnostics.tests.push({
      name: 'Firestore DB',
      status: 'FAIL',
      message: error.message,
    });
  }

  // 3. Check Authentication
  try {
    diagnostics.auth.initialized = !!auth;
    if (auth) {
      diagnostics.auth.currentUser = auth.currentUser?.uid || null;
      diagnostics.auth.isAuthenticated = !!auth.currentUser;
      diagnostics.tests.push({
        name: 'Authentication',
        status: auth.currentUser ? 'PASS' : 'WARN',
        message: auth.currentUser
          ? `User authenticated: ${auth.currentUser.email}`
          : 'No user authenticated (some collections require auth)',
      });
    } else {
      diagnostics.tests.push({
        name: 'Authentication',
        status: 'FAIL',
        message: 'Auth is not initialized',
      });
    }
  } catch (error) {
    diagnostics.auth.initialized = false;
    diagnostics.errors.push(`Auth Error: ${error.message}`);
    diagnostics.tests.push({
      name: 'Authentication',
      status: 'FAIL',
      message: error.message,
    });
  }

  // 4. Test Firestore Queries
  if (db) {
    // Test public collection (properties)
    try {
      const propertiesQuery = query(collection(db, 'properties'), limit(1));
      const propertiesSnapshot = await getDocs(propertiesQuery);
      diagnostics.firestore.propertiesTest = {
        success: true,
        count: propertiesSnapshot.docs.length,
        message: `Successfully queried properties collection. Found ${propertiesSnapshot.docs.length} document(s).`,
      };
      diagnostics.tests.push({
        name: 'Properties Query',
        status: 'PASS',
        message: `Found ${propertiesSnapshot.docs.length} property document(s)`,
      });
    } catch (error) {
      diagnostics.firestore.propertiesTest = {
        success: false,
        error: error.message,
        code: error.code,
      };
      diagnostics.errors.push(`Properties Query Error: ${error.message} (Code: ${error.code})`);
      diagnostics.tests.push({
        name: 'Properties Query',
        status: 'FAIL',
        message: `${error.message} (Code: ${error.code})`,
      });
    }

    // Test authenticated collection (if user is authenticated)
    if (auth?.currentUser) {
      try {
        const notificationsQuery = query(collection(db, 'notifications'), limit(1));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        diagnostics.firestore.notificationsTest = {
          success: true,
          count: notificationsSnapshot.docs.length,
          message: `Successfully queried notifications collection. Found ${notificationsSnapshot.docs.length} document(s).`,
        };
        diagnostics.tests.push({
          name: 'Notifications Query (Auth Required)',
          status: 'PASS',
          message: `Found ${notificationsSnapshot.docs.length} notification document(s)`,
        });
      } catch (error) {
        diagnostics.firestore.notificationsTest = {
          success: false,
          error: error.message,
          code: error.code,
        };
        diagnostics.errors.push(`Notifications Query Error: ${error.message} (Code: ${error.code})`);
        diagnostics.tests.push({
          name: 'Notifications Query (Auth Required)',
          status: 'FAIL',
          message: `${error.message} (Code: ${error.code})`,
        });
      }
    } else {
      diagnostics.tests.push({
        name: 'Notifications Query (Auth Required)',
        status: 'SKIP',
        message: 'Skipped - User not authenticated',
      });
    }
  }

  // 5. Check Environment Variables
  try {
    const envVars = {
      apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
    };
    diagnostics.firebase.envVars = envVars;
    const missingVars = Object.entries(envVars)
      .filter(([_, exists]) => !exists)
      .map(([key]) => key);
    if (missingVars.length > 0) {
      diagnostics.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
      diagnostics.tests.push({
        name: 'Environment Variables',
        status: 'FAIL',
        message: `Missing: ${missingVars.join(', ')}`,
      });
    } else {
      diagnostics.tests.push({
        name: 'Environment Variables',
        status: 'PASS',
        message: 'All Firebase environment variables are set',
      });
    }
  } catch (error) {
    diagnostics.errors.push(`Env Vars Check Error: ${error.message}`);
  }

  return diagnostics;
};

export const printDiagnostics = (diagnostics) => {
  console.group('🔍 Firebase Diagnostics Report');
  console.log('Timestamp:', diagnostics.timestamp);
  console.log('\n📊 Test Results:');
  diagnostics.tests.forEach((test) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test.name}: ${test.status} - ${test.message}`);
  });

  if (diagnostics.errors.length > 0) {
    console.log('\n❌ Errors:');
    diagnostics.errors.forEach((error) => console.error(error));
  }

  console.log('\n📋 Details:');
  console.log('Firebase:', diagnostics.firebase);
  console.log('Firestore:', diagnostics.firestore);
  console.log('Auth:', diagnostics.auth);
  console.groupEnd();

  return diagnostics;
};

