// Re-export all Firebase services for backward compatibility
import { getStorage } from 'firebase/storage';
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
  return !!app && !!auth && !!db;
};

export const getFirebaseInitError = () => {
  if (!app) {
    return new Error('Firebase app not initialized');
  }
  return null;
};
