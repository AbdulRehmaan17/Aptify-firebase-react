import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Safe Firebase initialization with error handling
let app = null;
let auth = null;
let db = null;
let storage = null;
let initError = null;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Check if required config is present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const missing = [];
    if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
    if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');

    console.error('🔥 Missing Firebase ENV variables:', missing);
    console.error('🔥 Current config:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasProjectId: !!firebaseConfig.projectId,
      hasAuthDomain: !!firebaseConfig.authDomain,
      apiKeyValue: firebaseConfig.apiKey
        ? `${firebaseConfig.apiKey.substring(0, 10)}...`
        : 'undefined',
      projectIdValue: firebaseConfig.projectId || 'undefined',
    });
    console.error('🔥 Environment check:', {
      envKeys: Object.keys(import.meta.env).filter((k) => k.startsWith('VITE_FIREBASE')),
      allEnvKeys: Object.keys(import.meta.env).slice(0, 20), // First 20 keys for debugging
    });

    initError = new Error(
      `Firebase Configuration Error: Missing required ENV variables: ${missing.join(', ')}. Please check your .env file.`
    );
  } else {
    // Initialize Firebase
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
      console.log('✅ Using existing Firebase app');
    } else {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase initialized successfully');
    }

    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    console.log('✅ Firebase services initialized:', {
      auth: !!auth,
      db: !!db,
      storage: !!storage,
    });
  }
} catch (error) {
  console.error('🔥 Firebase initialization error:', error);
  initError = error;
  // Don't throw - allow app to continue with null services
  // Components should check for null before using
}

// Export with null checks
export { auth, db, storage };
export { initError };

// Export GoogleAuthProvider for use in auth functions
export { GoogleAuthProvider };
export const googleProvider = new GoogleAuthProvider();

// Helper to check if Firebase is initialized
export const isFirebaseInitialized = () => {
  return !initError && !!auth && !!db && !!storage;
};

// Helper to get initialization error
export const getFirebaseInitError = () => {
  return initError;
};
