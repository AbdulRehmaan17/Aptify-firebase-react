// Re-export from main firebase.js for backward compatibility
export {
  auth,
  db,
  storage,
  initError,
  isFirebaseInitialized,
  getFirebaseInitError,
} from '../firebase';
