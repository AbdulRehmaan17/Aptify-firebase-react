// Main Firebase exports - centralized export point
// Import all Firebase services
import app, { firebaseConfig } from './config';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from './auth';
import { db } from './firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Export all Firebase services
export { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult };
export { db };
export { firebaseConfig, app };

// Storage is no longer used - using Cloudinary instead
// Export null for backward compatibility with existing code
export const storage = null;

// Functions initialization - only if app exists
let functions = null;
try {
  if (app) {
    functions = getFunctions(app);
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('Failed to initialize Firebase Functions:', error);
  }
}

export { functions, httpsCallable };

// Helper functions
export const isFirebaseInitialized = () => {
  return !!app && !!auth && !!db;
};

export const getFirebaseInitError = () => {
  if (!app) {
    return new Error('Firebase app not initialized');
  }
  if (!auth) {
    return new Error('Firebase Auth not initialized');
  }
  if (!db) {
    return new Error('Firebase Firestore not initialized');
  }
  // Storage check removed - using Cloudinary now
  return null;
};
