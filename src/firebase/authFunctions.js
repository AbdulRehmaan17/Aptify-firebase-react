import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile as updateFirebaseProfile,
  getIdToken,
  getIdTokenResult,
  reload,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
// AUTO-FIXED: Removed duplicate auth import - only import once
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from './auth';
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
    const user = userCredential.user;

    // Force getIdToken(true) on admin login to ensure latest claims are available
    try {
      // Check if user is admin by checking token claims or user document
      let isAdmin = false;
      try {
        const tokenResult = await getIdTokenResult(user, true); // Force refresh to get latest claims
        isAdmin = tokenResult.claims.admin === true;
      } catch (tokenError) {
        // If token check fails, try checking user document
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            isAdmin = userData.role === 'admin';
          }
        } catch (docError) {
          console.warn('Could not check admin status:', docError);
        }
      }

      // If admin, force token refresh to ensure latest claims are available
      if (isAdmin) {
        await getIdToken(user, true); // Force refresh token for admin
        console.log('✅ [Admin Login] Token refreshed for admin user');
      }
    } catch (tokenRefreshError) {
      // Log but don't fail login if token refresh fails
      console.warn('⚠️ [Admin Login] Token refresh warning (continuing):', tokenRefreshError);
    }

    return { success: true, user };
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

      // PHASE 1: Runtime verification - Log user data for debugging
      if (import.meta.env.DEV) {
        console.log('🔍 [Google Login] User data after sign-in:', {
          uid: user.uid,
          photoURL: user.photoURL,
          displayName: user.displayName,
          email: user.email,
          providerData: user.providerData?.map(p => ({
            providerId: p.providerId,
            photoURL: p.photoURL,
            displayName: p.displayName
          })) || []
        });
      }

      // CRITICAL: Reload Firebase Auth user to get latest profile data (including photoURL)
      // This ensures Google profile image changes are reflected immediately
      try {
        await reload(user);
        // Re-read user after reload to get updated photoURL
        user = auth.currentUser || user;
        
        // PHASE 1: Verify photoURL after reload
        if (import.meta.env.DEV) {
          console.log('🔍 [Google Login] User data after reload:', {
            uid: user.uid,
            photoURL: user.photoURL,
            providerData: user.providerData?.map(p => ({
              providerId: p.providerId,
              photoURL: p.photoURL
            })) || []
          });
        }
      } catch (reloadError) {
        // Log but don't fail login if reload fails
        console.warn('⚠️ [Google Login] Failed to reload user (continuing):', reloadError);
      }

      // Force getIdToken(true) on admin login to ensure latest claims are available
      try {
        let isAdmin = false;
        try {
          const tokenResult = await getIdTokenResult(user, true); // Force refresh to get latest claims
          isAdmin = tokenResult.claims.admin === true;
        } catch (tokenError) {
          // If token check fails, try checking user document
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              isAdmin = userData.role === 'admin';
            }
          } catch (docError) {
            console.warn('Could not check admin status:', docError);
          }
        }

        // If admin, force token refresh to ensure latest claims are available
        if (isAdmin) {
          await getIdToken(user, true); // Force refresh token for admin
          console.log('✅ [Admin Login] Token refreshed for admin user (Google)');
        }
      } catch (tokenRefreshError) {
        // Log but don't fail login if token refresh fails
        console.warn('⚠️ [Admin Login] Token refresh warning (continuing):', tokenRefreshError);
      }

      // Create or update user profile (will sync Google photoURL if missing)
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

    let user = result.user;

    // PHASE 1: Runtime verification - Log user data for debugging
    if (import.meta.env.DEV) {
      console.log('🔍 [Google Redirect] User data after redirect:', {
        uid: user.uid,
        photoURL: user.photoURL,
        displayName: user.displayName,
        email: user.email,
        providerData: user.providerData?.map(p => ({
          providerId: p.providerId,
          photoURL: p.photoURL,
          displayName: p.displayName
        })) || []
      });
    }

    // CRITICAL: Reload Firebase Auth user to get latest profile data (including photoURL)
    // This ensures Google profile image changes are reflected immediately
    try {
      await reload(user);
      // Re-read user after reload to get updated photoURL
      user = auth.currentUser || user;
      
      // PHASE 1: Verify photoURL after reload
      if (import.meta.env.DEV) {
        console.log('🔍 [Google Redirect] User data after reload:', {
          uid: user.uid,
          photoURL: user.photoURL,
          providerData: user.providerData?.map(p => ({
            providerId: p.providerId,
            photoURL: p.photoURL
          })) || []
        });
      }
    } catch (reloadError) {
      // Log but don't fail login if reload fails
      console.warn('⚠️ [Google Redirect] Failed to reload user (continuing):', reloadError);
    }

    // Force getIdToken(true) on admin login to ensure latest claims are available
    try {
      let isAdmin = false;
      try {
        const tokenResult = await getIdTokenResult(user, true); // Force refresh to get latest claims
        isAdmin = tokenResult.claims.admin === true;
      } catch (tokenError) {
        // If token check fails, try checking user document
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            isAdmin = userData.role === 'admin';
          }
        } catch (docError) {
          console.warn('Could not check admin status:', docError);
        }
      }

      // If admin, force token refresh to ensure latest claims are available
      if (isAdmin) {
        await getIdToken(user, true); // Force refresh token for admin
        console.log('✅ [Admin Login] Token refreshed for admin user (Google Redirect)');
      }
    } catch (tokenRefreshError) {
      // Log but don't fail login if token refresh fails
      console.warn('⚠️ [Admin Login] Token refresh warning (continuing):', tokenRefreshError);
    }

    // Create or update user profile (will sync Google photoURL if missing)
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
        errorMessage =
          'An account already exists with this email. Please sign in with your original method.';
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

    // AUTO-FIXED: Use userProfiles collection per Firestore rules (owner-only access)
    // Also create in users collection for backward compatibility
    const userProfileRef = doc(db, 'userProfiles', user.uid);
    const userRef = doc(db, 'users', user.uid);

    try {
      // Try userProfiles first (per rules)
      let userProfileDoc = null;
      try {
        userProfileDoc = await getDoc(userProfileRef);
      } catch (profileError) {
        console.warn('Error reading userProfiles, will try users collection:', profileError);
      }

      // Also check users collection for backward compatibility
      const userDoc = await getDoc(userRef);

      // Base profile data from Firebase Auth + any additional fields
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

      // Existing Firestore data (from userProfiles or users collection)
      const existingData = userProfileDoc?.exists()
        ? userProfileDoc.data()
        : userDoc.exists()
        ? userDoc.data()
        : {};

      // FINAL PROFILE MERGE (Google/profile sync point)
      // IMPORTANT:
      // - We PREFILL missing fields from Firebase Auth
      // - We sync Google photoURL if Firestore photoURL is missing
      // - We preserve existing Firestore photoURL if user has manually set one
      //   (unless it's a Google URL that matches the current Google photoURL)
      const googlePhotoURL = user.photoURL || profileData.photoURL;
      const existingPhotoURL = existingData.photoURL;
      
      // Determine final photoURL:
      // 1. If Firestore has no photoURL, use Google photoURL
      // 2. If Firestore photoURL is a Google URL and Google photoURL exists, update it
      // 3. Otherwise, preserve existing Firestore photoURL (user's custom avatar)
      let finalPhotoURL = existingPhotoURL || googlePhotoURL;
      if (googlePhotoURL && (!existingPhotoURL || existingPhotoURL.includes('googleusercontent.com'))) {
        // Update if missing or if existing is a Google URL (sync Google profile changes)
        finalPhotoURL = googlePhotoURL;
      }
      
      const finalProfileData = {
        // Preserve any existing fields by default
        ...existingData,
        // Core identity fields: only set if missing in Firestore
        uid: existingData.uid || user.uid,
        email: existingData.email || profileData.email,
        displayName: existingData.displayName || profileData.displayName,
        name: existingData.name || profileData.name,
        // Google photo sync: use determined finalPhotoURL
        photoURL: finalPhotoURL,
        // Metadata & role
        createdAt: existingData.createdAt || serverTimestamp(),
        role: existingData.role || additionalData.role || 'customer',
        // Contact info: don't drop existing values
        phone: existingData.phone || profileData.phone,
        phoneNumber: existingData.phoneNumber || profileData.phoneNumber,
        // Structured fields
        addresses: existingData.addresses || [],
        // Always refresh lastLogin/updatedAt on auth events
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Update userProfiles (per Firestore rules)
      try {
        await setDoc(userProfileRef, finalProfileData, { merge: true });
      } catch (profileError) {
        console.warn('Error updating userProfiles:', profileError);
        // Continue to update users collection for backward compatibility
      }

      // Also update users collection for backward compatibility
      if (userDoc.exists()) {
        await setDoc(userRef, finalProfileData, { merge: true });
      } else {
        await setDoc(userRef, finalProfileData);
      }

      return { success: true };
    } catch (firestoreError) {
      // Handle Firestore permission errors specifically
      if (firestoreError.code === 'permission-denied') {
        console.error(
          'Firestore permission denied when creating/updating user profile:',
          firestoreError
        );
        return {
          success: false,
          error: 'Permission denied. Please check Firestore security rules.',
        };
      }
      throw firestoreError; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to create/update user profile',
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
