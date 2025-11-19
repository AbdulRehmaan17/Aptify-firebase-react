import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Configure Google Auth Provider with additional scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const loginWithEmail = async (email, password) => {
  try {
    if (!auth) {
      return {
        success: false,
        error:
          'Authentication service is not initialized. Please check your Firebase configuration.',
      };
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    let errorMessage = 'Failed to sign in. Please try again.';

    // Provide user-friendly error messages
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

export const registerWithEmail = async (email, password, fullName) => {
  try {
    if (!auth) {
      return {
        success: false,
        error:
          'Authentication service is not initialized. Please check your Firebase configuration.',
      };
    }
    if (!db) {
      return {
        success: false,
        error: 'Database service is not initialized. Please check your Firebase configuration.',
      };
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Create user document in Firestore
    try {
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: email,
        displayName: fullName,
        createdAt: serverTimestamp(),
        role: 'customer',
        addresses: [],
        orders: [],
        wishlist: [],
      });
    } catch (firestoreError) {
      console.error('Error creating user document:', firestoreError);
      // Don't fail registration if Firestore write fails, user is already created in Auth
    }

    return { success: true, user: result.user };
  } catch (error) {
    let errorMessage = 'Failed to create account. Please try again.';

    // Provide user-friendly error messages
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please use a stronger password.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Helper function to create or update user document in Firestore
 */
const createOrUpdateUserDocument = async (user) => {
  if (!db) {
    console.warn('Database not initialized, skipping user document creation');
    return;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        role: 'customer',
        addresses: [],
        orders: [],
        wishlist: [],
        provider: 'google',
      });
    } else {
      // Update existing user document with latest info
      await setDoc(
        userDocRef,
        {
          email: user.email || userDoc.data().email,
          displayName: user.displayName || userDoc.data().displayName,
          photoURL: user.photoURL || userDoc.data().photoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (firestoreError) {
    console.error('Error creating/updating user document:', firestoreError);
    // Don't fail auth if Firestore write fails
  }
};

/**
 * Sign in with Google using popup method
 * Falls back to redirect if popup is blocked
 */
export const loginWithGoogle = async (useRedirect = false) => {
  try {
    if (!auth) {
      return {
        success: false,
        error:
          'Authentication service is not initialized. Please check your Firebase configuration.',
      };
    }

    let result;

    if (useRedirect) {
      // Use redirect method (fallback for popup blockers)
      await signInWithRedirect(auth, googleProvider);
      // Note: The result will be handled by getRedirectResult in the component
      return { success: true, redirect: true };
    } else {
      // Try popup method first
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupError) {
        // If popup is blocked, fall back to redirect
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user'
        ) {
          console.log('Popup blocked or closed, falling back to redirect method');
          await signInWithRedirect(auth, googleProvider);
          return { success: true, redirect: true, message: 'Redirecting to Google sign in...' };
        }
        throw popupError;
      }
    }

    // If we have a result (popup succeeded), create/update user document
    if (result && result.user) {
      await createOrUpdateUserDocument(result.user);
      return { success: true, user: result.user };
    }

    return { success: true, redirect: true };
  } catch (error) {
    let errorMessage = 'Failed to sign in with Google. Please try again.';

    // Provide user-friendly error messages
    switch (error.code) {
      case 'auth/popup-blocked':
        errorMessage =
          'Popup was blocked by your browser. Please allow popups and try again, or use the redirect method.';
        break;
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign in was cancelled. Please try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Only one popup request is allowed at a time. Please wait and try again.';
        break;
      case 'auth/account-exists-with-different-credential':
        errorMessage =
          'An account already exists with this email using a different sign-in method.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Google sign-in is not enabled. Please contact support.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection and try again.';
        break;
      case 'auth/auth-domain-config-required':
        errorMessage = 'Authentication domain not configured. Please contact support.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    console.error('Google sign-in error:', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Handle redirect result after Google sign-in
 * Call this in your Auth component's useEffect on mount
 */
export const handleGoogleRedirect = async () => {
  try {
    if (!auth) {
      return { success: false, error: 'Authentication service is not initialized.' };
    }

    const result = await getRedirectResult(auth);

    if (result && result.user) {
      await createOrUpdateUserDocument(result.user);
      return { success: true, user: result.user };
    }

    return { success: false, error: null }; // No redirect result
  } catch (error) {
    let errorMessage = 'Failed to complete Google sign-in.';

    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        errorMessage =
          'An account already exists with this email using a different sign-in method.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

export const logout = async () => {
  try {
    if (!auth) {
      return { success: false, error: 'Authentication service is not initialized.' };
    }

    await signOut(auth);
    return { success: true };
  } catch (error) {
    let errorMessage = 'Failed to sign out. Please try again.';

    switch (error.code) {
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

export const resetPassword = async (email) => {
  try {
    if (!auth) {
      return { success: false, error: 'Authentication service is not initialized.' };
    }

    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    let errorMessage = 'Failed to send password reset email.';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

export const getCurrentUser = () => {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
};
