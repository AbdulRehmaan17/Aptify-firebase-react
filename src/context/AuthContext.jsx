import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getIdTokenResult } from 'firebase/auth';
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

  // Safe AuthContext: register single auth listener, store loading state, no direct navigate in listener
  useEffect(() => {
    // Check if auth is available
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError('Firebase authentication is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    // Register exactly one auth listener and clean it up
    // CRITICAL: Do NOT call navigate() here - only update state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Update state only — do NOT navigate here
      setCurrentUser(user || null);
      setError(null);

      if (user) {
        try {
          // FIXED: Get ID token to check for admin custom claim
          let adminClaim = false;
          try {
            const tokenResult = await getIdTokenResult(user, true); // Force refresh to get latest claims
            adminClaim = tokenResult.claims.admin === true;
          } catch (tokenError) {
            console.warn('Failed to get ID token for admin claim check:', tokenError);
          }
          
          // Use userProfiles collection per Firestore rules
          if (db) {
            const snap = await getDoc(doc(db, 'userProfiles', user.uid));
            if (snap.exists()) {
              const profileData = snap.data();
              setUserProfile({ id: snap.id, ...profileData });
              // FIXED: Use admin claim if available, otherwise use role from profile
              setCurrentUserRole(adminClaim ? 'admin' : (profileData.role || 'user'));
            } else {
              // Try users collection as fallback for backward compatibility
              try {
                const usersSnap = await getDoc(doc(db, 'users', user.uid));
                if (usersSnap.exists()) {
                  const profileData = usersSnap.data();
                  setUserProfile({ id: usersSnap.id, ...profileData });
                  // FIXED: Use admin claim if available, otherwise use role from profile
                  setCurrentUserRole(adminClaim ? 'admin' : (profileData.role || 'user'));
                } else {
                  setUserProfile(null);
                  // FIXED: Use admin claim if available
                  setCurrentUserRole(adminClaim ? 'admin' : 'user');
                }
              } catch (e) {
                console.error('Failed to load user profile from users collection', e);
                setUserProfile(null);
                // FIXED: Use admin claim if available
                setCurrentUserRole(adminClaim ? 'admin' : 'user');
              }
            }
          } else {
            setUserProfile(null);
            // FIXED: Use admin claim if available
            setCurrentUserRole(adminClaim ? 'admin' : 'user');
          }
        } catch (e) {
          console.error('Failed to load user profile', e);
          setUserProfile(null);
          // FIXED: Try to get admin claim even on error
          try {
            const tokenResult = await getIdTokenResult(user, true);
            const adminClaim = tokenResult.claims.admin === true;
            setCurrentUserRole(adminClaim ? 'admin' : 'user');
          } catch (tokenError) {
            setCurrentUserRole('user');
          }
        }
      } else {
        // User logged out
        setUserProfile(null);
        setCurrentUserRole('user');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to notifications for unread count
  // FIXED: Enhanced error handling and auth checks
  useEffect(() => {
    // Guard: Ensure user is authenticated and db is available
    // FIXED: Wait for auth to be ready before querying
    if (loading || !currentUser || !currentUser.uid || !db || !auth?.currentUser) {
      setUnreadCount(0);
      return;
    }

    let unsubscribeNotifications = null;

    try {
      // Notifications require authentication per rules
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          setUnreadCount(snapshot.size);
        },
        (err) => {
          console.error('Error listening to notifications:', err);
          // FIXED: Handle permission errors gracefully
          if (err.code === 'permission-denied') {
            console.warn('Permission denied when fetching notifications. User may not be authenticated.');
            setUnreadCount(0);
            return;
          }
          // Fallback without orderBy for index errors
          if (err.code === 'failed-precondition') {
            const fallbackQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', currentUser.uid),
              where('read', '==', false)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                setUnreadCount(snapshot.size);
              },
              (fallbackErr) => {
                console.error('Error listening to notifications (fallback):', fallbackErr);
                setUnreadCount(0);
              }
            );
            return () => {
              if (fallbackUnsubscribe) fallbackUnsubscribe();
            };
          }
          setUnreadCount(0);
        }
      );
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }
    };
  }, [loading, currentUser?.uid, db, auth]);

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
      // Refresh user profile (using userProfiles per rules)
      if (user && db) {
        const userProfileRef = doc(db, 'userProfiles', user.uid);
        const userProfileDoc = await getDoc(userProfileRef);
        if (userProfileDoc.exists()) {
          setUserProfile({ id: userProfileDoc.id, ...userProfileDoc.data() });
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
    // FIXED: Check both role from profile and custom claim
    const roleFromProfile = getUserRole();
    if (roleFromProfile === 'admin') return true;
    
    // Also check custom claim if available
    if (currentUser) {
      // Note: Custom claims are checked in onAuthStateChanged and stored in currentUserRole
      return currentUserRole === 'admin';
    }
    
    return false;
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

  // AUTO-FIXED: Show loading state while auth is initializing to prevent blank screens
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '4px solid #E2E8F0',
            borderTop: '4px solid #0D9488',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }}></div>
          <p style={{ color: '#475569', fontSize: '16px' }}>Loading...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

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
