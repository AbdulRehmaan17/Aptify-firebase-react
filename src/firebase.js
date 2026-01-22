// src/firebase.js
// Centralized Firebase configuration for Netlify deployment
// All Firebase imports should use: import { auth, db } from "./firebase";
// Note: storage is exported as null (Cloudinary is used for media storage)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Use environment variables (Vite syntax)
// For Netlify: Set these in Netlify environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
// Storage is no longer used - using Cloudinary instead
// Export null for backward compatibility with existing code
export const storage = null;

export default app;
