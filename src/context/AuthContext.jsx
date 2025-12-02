import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import {
  login,
  signup,
  loginWithGoogle,
  handleGoogleRedirect,
  logout,
  createOrUpdateUserProfile,
} from '../firebase/authFunctions';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if auth is available
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError('Firebase authentication is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser?.uid);
        setCurrentUser(firebaseUser);
        setError(null);

        if (firebaseUser && db) {
          // Fetch user profile from Firestore
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const profileData = userDoc.data();
              setUserProfile({ id: userDoc.id, ...profileData });
            } else {
              // Create profile if it doesn't exist
              await createOrUpdateUserProfile(firebaseUser);
              const newUserDoc = await getDoc(userDocRef);
              if (newUserDoc.exists()) {
                setUserProfile({ id: newUserDoc.id, ...newUserDoc.data() });
              }
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
            setError('Failed to load user profile.');
          }
        } else {
          setUserProfile(null);
        }

        setLoading(false);
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Login function
  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Auth state change will update currentUser automatically
      return { success: true, user: result.user };
    } catch (err) {
      const errorMessage = err.message || 'Failed to login';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Signup function
  const handleSignup = async (email, password, name) => {
    try {
      setLoading(true);
      setError(null);
      const result = await signup(email, password, name);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Auth state change will update currentUser automatically
      return { success: true, user: result.user };
    } catch (err) {
      const errorMessage = err.message || 'Failed to sign up';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Google login function
  const handleLoginWithGoogle = async (useRedirect = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await loginWithGoogle(useRedirect);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }

      if (result.redirect) {
        // Redirect flow - don't set loading to false yet
        return { success: true, redirect: true };
      }

      // Auth state change will update currentUser automatically
      setLoading(false);
      return { success: true, user: result.user };
    } catch (err) {
      const errorMessage = err.message || 'Failed to login with Google';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Handle Google redirect result
  const handleGoogleRedirectResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await handleGoogleRedirect();
      
      if (!result.success) {
        if (result.error) {
          setError(result.error);
        }
        setLoading(false);
        return result;
      }

      // Auth state change will update currentUser automatically
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to complete Google sign-in';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await logout();
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Clear user state
      setCurrentUser(null);
      setUserProfile(null);
      setLoading(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Failed to logout';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Create or update user profile
  const handleCreateOrUpdateUserProfile = async (user) => {
    try {
      await createOrUpdateUserProfile(user);
      // Refresh user profile
      if (user && db) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile({ id: userDoc.id, ...userDoc.data() });
        }
      }
      return { success: true };
    } catch (err) {
      console.error('Error creating/updating user profile:', err);
      return { success: false, error: err.message };
    }
  };

  // Get user role
  const getUserRole = () => {
    return userProfile?.role || 'customer';
  };

  // Check if user is admin
  const isAdmin = () => {
    return getUserRole() === 'admin';
  };

  // Check if user is provider
  const isProvider = () => {
    const role = getUserRole();
    return role === 'constructor' || role === 'renovator' || role === 'provider';
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    login: handleLogin,
    signup: handleSignup,
    loginWithGoogle: handleLoginWithGoogle,
    handleGoogleRedirect: handleGoogleRedirectResult,
    logout: handleLogout,
    createOrUpdateUserProfile: handleCreateOrUpdateUserProfile,
    getUserRole,
    isAdmin,
    isProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
