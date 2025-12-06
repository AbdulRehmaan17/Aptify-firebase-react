import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
  const [currentUserRole, setCurrentUserRole] = useState('user');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check if auth is available
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError('Firebase authentication is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!mounted) return;

        try {
          console.log('Auth state changed:', firebaseUser?.uid);
          setCurrentUser(firebaseUser);
          setError(null);

          if (!firebaseUser) {
            // User logged out
            setUserProfile(null);
            setCurrentUserRole('user');
            if (mounted) {
              setLoading(false);
            }
            return;
          }

          // Guard: Ensure db is available before making Firestore calls
          if (!db) {
            console.warn('Firestore db is not initialized, skipping profile fetch');
            if (mounted) {
              setLoading(false);
            }
            return;
          }

          // Always call createOrUpdateUserProfile to ensure lastLogin is updated
          // Don't await - let it run in background, but handle errors
          createOrUpdateUserProfile(firebaseUser).catch((profileError) => {
            console.error('Error in createOrUpdateUserProfile:', profileError);
            // Don't block auth state change if profile update fails
          });
          
          // Fetch user profile from Firestore
          try {
            if (!mounted || !db) return;

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!mounted) return;

            if (userDoc.exists()) {
              const profileData = userDoc.data();
              setUserProfile({ id: userDoc.id, ...profileData });
              setCurrentUserRole(profileData.role || 'user');
            } else {
              // If still doesn't exist after createOrUpdateUserProfile, wait a bit and retry
              setTimeout(async () => {
                if (!mounted || !db) return;
                try {
                  const retryDoc = await getDoc(userDocRef);
                  if (mounted && retryDoc.exists()) {
                    const profileData = retryDoc.data();
                    setUserProfile({ id: retryDoc.id, ...profileData });
                    setCurrentUserRole(profileData.role || 'user');
                  }
                } catch (retryErr) {
                  console.error('Error retrying user profile fetch:', retryErr);
                }
              }, 500);
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
            // Don't set error state - profile fetch failure shouldn't block auth
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Unexpected error in auth state change handler:', err);
          if (mounted) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
          }
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        if (mounted) {
          setError(err.message || 'Authentication error');
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Listen to notifications for unread count
  useEffect(() => {
    // Guard: Ensure user and db are available
    if (!currentUser || !currentUser.uid || !db) {
      setUnreadCount(0);
      return;
    }

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );

      const unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          setUnreadCount(snapshot.size);
        },
        (err) => {
          console.error('Error listening to notifications:', err);
          // Handle permission errors gracefully
          if (err.code === 'permission-denied') {
            console.warn('Permission denied when fetching notifications. Check Firestore rules.');
          }
          setUnreadCount(0);
        }
      );

      return () => unsubscribeNotifications();
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setUnreadCount(0);
    }
  }, [currentUser, db]);

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

      // Call createOrUpdateUserProfile to update lastLogin
      if (result.user) {
        await createOrUpdateUserProfile(result.user);
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

      // createOrUpdateUserProfile is already called in loginWithGoogle
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
    user: currentUser, // Alias for backward compatibility
    userProfile,
    loading,
    error,
    currentUserRole,
    unreadCount,
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
