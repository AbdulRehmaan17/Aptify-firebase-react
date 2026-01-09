import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import app from './config';

// Initialize Auth
export const auth = app ? getAuth(app) : null;

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
// PHASE 2: Ensure OAuth scopes include profile and email for photoURL access
googleProvider.addScope('profile'); // Required for photoURL
googleProvider.addScope('email'); // Required for email
// Set custom parameters to ensure profile data is returned
googleProvider.setCustomParameters({
  prompt: 'select_account' // Ensures fresh profile data
});

// Export Google auth functions
export { signInWithPopup, signInWithRedirect, getRedirectResult };
