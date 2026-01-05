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
import { getStorage } from 'firebase/storage';

// Export all Firebase services
export { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult };
export { db };
export { firebaseConfig, app };

// Storage initialization - only if app exists
let storage = null;
try {
  if (app) {
    storage = getStorage(app);
  }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to initialize Firebase Storage:', error);
    }
  }

export { storage };

// Helper functions
export const isFirebaseInitialized = () => {
  return !!app && !!auth && !!db && !!storage;
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
  if (!storage) {
    return new Error('Firebase Storage not initialized');
  }
  return null;
};
