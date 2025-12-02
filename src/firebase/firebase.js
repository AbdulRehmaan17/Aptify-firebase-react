// Re-export all Firebase services for backward compatibility
export { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from './auth';
export { db } from './firestore';
export { firebaseConfig, app } from './config';

// Storage (keep existing storage initialization)
import { getStorage } from 'firebase/storage';
import { app } from './config';
import { auth } from './auth';
import { db } from './firestore';

export const storage = app ? getStorage(app) : null;

// Helper functions
export const isFirebaseInitialized = () => {
  return !!app && !!auth && !!db;
};

export const getFirebaseInitError = () => {
  if (!app) {
    return new Error('Firebase app not initialized');
  }
  return null;
};
