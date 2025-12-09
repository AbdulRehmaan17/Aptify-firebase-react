import { initializeApp, getApps } from 'firebase/app';

// Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName] || import.meta.env[varName].trim() === ''
);

if (missingVars.length > 0) {
  console.warn('⚠️ Missing Firebase environment variables:', missingVars.join(', '));
  console.warn('⚠️ Please create a .env.local file with all VITE_FIREBASE_* variables');
}

// Initialize Firebase app
let app = null;
try {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    // Only initialize if we have the minimum required config
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig);
    } else {
      console.error('❌ Cannot initialize Firebase: Missing required configuration');
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
}

export { app };
