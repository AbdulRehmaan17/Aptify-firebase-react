// Re-export all Firebase services for backward compatibility
import app from './config';

export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from './auth';
export { db } from './firestore';
export { firebaseConfig } from './config';
export { default as app };

// Storage is no longer used - using Cloudinary instead
// Export null for backward compatibility with existing code
export const storage = null;

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
