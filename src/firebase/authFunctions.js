import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider } from './auth';
import { db } from './firestore';

/**
 * Login with email and password
 */
export const login = async (email, password) => {
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

/**
 * Sign up with email and password
 */
export const signup = async (email, password, name, phone = '') => {
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

    // Create user document in Firestore using createOrUpdateUserProfile
    try {
      await createOrUpdateUserProfile(result.user, { name, phone });
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
      await createOrUpdateUserProfile(result.user);
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
      await createOrUpdateUserProfile(result.user);
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

/**
 * Logout current user
 */
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

/**
 * Create or update user profile in Firestore
 * @param {Object} user - Firebase Auth user object
 * @param {Object} additionalData - Additional data to include (name, phone, etc.)
 */
export const createOrUpdateUserProfile = async (user, additionalData = {}) => {
  if (!db) {
    console.warn('Database not initialized, skipping user document creation');
    return;
  }

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const providerId = user.providerData?.[0]?.providerId || 'password';
    const isNewUser = !userDoc.exists();

    if (isNewUser) {
      // Create new user document with all required fields
      await setDoc(userDocRef, {
        uid: user.uid,
        name: additionalData.name || user.displayName || user.email?.split('@')[0] || '',
        email: user.email || '',
        phone: additionalData.phone || '',
        photoURL: user.photoURL || '',
        role: 'user', // Default role
        provider: providerId,
        providerType: null,
        isProviderApproved: false,
        walletBalance: 0,
        totalBookings: 0,
        totalReviews: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } else {
      // Update existing user document with latest info and lastLogin
      const existingData = userDoc.data();
      const updateData = {
        name: additionalData.name || user.displayName || existingData.name || user.email?.split('@')[0] || '',
        email: user.email || existingData.email || '',
        photoURL: user.photoURL || existingData.photoURL || '',
        provider: providerId,
        lastLogin: serverTimestamp(),
      };
      
      // Only update phone if provided and different
      if (additionalData.phone !== undefined && additionalData.phone !== existingData.phone) {
        updateData.phone = additionalData.phone;
      }
      
      await setDoc(userDocRef, updateData, { merge: true });
    }
  } catch (firestoreError) {
    console.error('Error creating/updating user document:', firestoreError);
    // Don't fail auth if Firestore write fails
  }
};

/**
 * Send password reset email
 */
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

/**
 * Get current authenticated user
 */
export const getCurrentUser = () => {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
};

/**
 * Update user password
 * Requires reauthentication for security
 * @param {Object} user - Firebase Auth user object
 * @param {string} currentPassword - Current password for reauthentication
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserPassword = async (user, currentPassword, newPassword) => {
  try {
    if (!auth || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    let errorMessage = 'Failed to update password';

    switch (error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Current password is incorrect';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'Please log out and log back in before changing your password';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid credentials';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

