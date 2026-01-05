// Re-export all Firebase services for backward compatibility
// FIXED: Removed duplicate storage initialization - storage is exported from index.js
export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from './auth';
export { db } from './firestore';
export { firebaseConfig } from './config';
export { default as app } from './config';
// FIXED: Import storage from index.js instead of creating duplicate
export { storage } from './index';

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
