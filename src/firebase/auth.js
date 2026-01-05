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
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Export Google auth functions
export { signInWithPopup, signInWithRedirect, getRedirectResult };
