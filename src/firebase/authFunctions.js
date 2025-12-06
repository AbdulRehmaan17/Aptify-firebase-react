import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from './auth';
import { db } from './firestore';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: User, error?: string}>}
 */
export const login = async (email, password) => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Failed to login';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password.';
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
      default:
        errorMessage = error.message || 'Failed to login';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User display name
 * @returns {Promise<{success: boolean, user?: User, error?: string}>}
 */
export const signup = async (email, password, name) => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Firebase Auth profile with display name
    if (name) {
      await updateFirebaseProfile(user, { displayName: name });
    }

    // Create user profile in Firestore
    const profileResult = await createOrUpdateUserProfile(user);
    if (!profileResult.success) {
      console.error('Failed to create user profile:', profileResult.error);
      // Don't fail signup if profile creation fails - user is already created in Auth
    }

    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'Failed to create account';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please use a stronger password.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled.';
        break;
      default:
        errorMessage = error.message || 'Failed to create account';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Login with Google (popup)
 * @param {boolean} useRedirect - Whether to use redirect flow
 * @returns {Promise<{success: boolean, user?: User, redirect?: boolean, error?: string}>}
 */
export const loginWithGoogle = async (useRedirect = false) => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    if (!googleProvider) {
      return { success: false, error: 'Google provider is not initialized' };
    }

    let user;
    if (useRedirect) {
      // Redirect flow
      await signInWithRedirect(auth, googleProvider);
      return { success: true, redirect: true };
    } else {
      // Popup flow
      const result = await signInWithPopup(auth, googleProvider);
      user = result.user;
      
      // Create or update user profile
      const profileResult = await createOrUpdateUserProfile(user);
      if (!profileResult.success) {
        console.error('Failed to create/update user profile:', profileResult.error);
        // Don't fail login if profile update fails
      }
      
      return { success: true, user };
    }
  } catch (error) {
    console.error('Google login error:', error);
    let errorMessage = 'Failed to login with Google';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Login popup was closed. Please try again.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Another login popup is already open.';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
        break;
      default:
        errorMessage = error.message || 'Failed to login with Google';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Handle Google redirect result
 * @returns {Promise<{success: boolean, user?: User, error?: string}>}
 */
export const handleGoogleRedirect = async () => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    const result = await getRedirectResult(auth);
    
    if (!result) {
      return { success: false, error: 'No redirect result found' };
    }

    const user = result.user;
    
    // Create or update user profile
    const profileResult = await createOrUpdateUserProfile(user);
    if (!profileResult.success) {
      console.error('Failed to create/update user profile:', profileResult.error);
      // Don't fail redirect if profile update fails
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Google redirect error:', error);
    let errorMessage = 'Failed to complete Google sign-in';
    
    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        errorMessage = 'An account already exists with this email. Please sign in with your original method.';
        break;
      default:
        errorMessage = error.message || 'Failed to complete Google sign-in';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Logout current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const logout = async () => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message || 'Failed to logout' };
  }
};

/**
 * Create or update user profile in Firestore
 * @param {User} user - Firebase user object
 * @param {Object} additionalData - Additional user data to include
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const createOrUpdateUserProfile = async (user, additionalData = {}) => {
  try {
    // Guard: Ensure user and db are available
    if (!user || !user.uid) {
      console.warn('Cannot create/update user profile: user or uid is null');
      return { success: false, error: 'User not authenticated' };
    }

    if (!db) {
      console.warn('Cannot create/update user profile: Firestore db is not initialized');
      return { success: false, error: 'Firestore not initialized' };
    }

    // Guard: Ensure auth is ready - wait a bit if needed
    if (!auth || !auth.currentUser) {
      // If auth.currentUser is null but we have user, it might be during signup
      // Continue anyway as the user object is provided
      console.log('Auth may not be fully initialized, but proceeding with provided user object');
    }

    const userRef = doc(db, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userRef);

      const profileData = {
        email: user.email || '',
        displayName: user.displayName || additionalData.name || user.email?.split('@')[0] || 'User',
        name: user.displayName || additionalData.name || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || additionalData.photoURL || null,
        phoneNumber: user.phoneNumber || additionalData.phone || additionalData.phoneNumber || null,
        phone: user.phoneNumber || additionalData.phone || additionalData.phoneNumber || null,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData,
      };

      if (userDoc.exists()) {
        // Update existing profile - preserve existing fields
        const existingData = userDoc.data();
        await setDoc(
          userRef,
          {
            ...profileData,
            createdAt: existingData.createdAt || serverTimestamp(),
            role: existingData.role || additionalData.role || 'customer',
            // Preserve existing fields if not provided
            phone: existingData.phone || profileData.phone,
            phoneNumber: existingData.phoneNumber || profileData.phoneNumber,
            addresses: existingData.addresses || [],
          },
          { merge: true }
        );
      } else {
        // Create new profile
        await setDoc(userRef, {
          ...profileData,
          createdAt: serverTimestamp(),
          role: additionalData.role || 'customer',
          phone: profileData.phone,
          phoneNumber: profileData.phoneNumber,
          addresses: [],
        });
      }

      return { success: true };
    } catch (firestoreError) {
      // Handle Firestore permission errors specifically
      if (firestoreError.code === 'permission-denied') {
        console.error('Firestore permission denied when creating/updating user profile:', firestoreError);
        return { 
          success: false, 
          error: 'Permission denied. Please check Firestore security rules.' 
        };
      }
      throw firestoreError; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create/update user profile' 
    };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetPassword = async (email) => {
  try {
    if (!auth) {
      return { success: false, error: 'Firebase auth is not initialized' };
    }

    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to send password reset email';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many requests. Please try again later.';
        break;
      default:
        errorMessage = error.message || 'Failed to send password reset email';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Update user password
 * @param {User} user - Firebase user object
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserPassword = async (user, currentPassword, newPassword) => {
  try {
    if (!auth || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Re-authenticate user with current password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
    
    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    let errorMessage = 'Failed to update password';
    
    switch (error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Current password is incorrect.';
        break;
      case 'auth/weak-password':
        errorMessage = 'New password is too weak. Please use a stronger password.';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'Please log out and log back in before changing your password.';
        break;
      default:
        errorMessage = error.message || 'Failed to update password';
    }
    
    return { success: false, error: errorMessage };
  }
};
