import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, getFirebaseInitError, googleProvider } from '../firebase';
import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Check for Firebase initialization error
    const initError = getFirebaseInitError();
    if (initError) {
      console.error('Firebase initialization error:', initError);
      setError(initError.message);
      setLoading(false);
      return;
    }

    // Check if auth is available
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError('Firebase authentication is not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = auth.onAuthStateChanged(
        async (firebaseUser) => {
          console.log('Auth state changed:', firebaseUser); // Debug log
          setUser(firebaseUser);

          // Fetch user profile and role from Firestore
          if (firebaseUser && db) {
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const profileData = userDoc.data();
                setUserProfile(profileData);
                setCurrentUserRole(profileData.role || 'customer');
              } else {
                // User document doesn't exist yet, will be created on registration
                setUserProfile(null);
                setCurrentUserRole(null);
              }
            } catch (profileError) {
              console.error('Error fetching user profile:', profileError);
              setUserProfile(null);
              setCurrentUserRole(null);
            }
          } else {
            setUserProfile(null);
            setCurrentUserRole(null);
          }

          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setUser(null);
          setUserProfile(null);
          setCurrentUserRole(null);
          setLoading(false);
          setError(error.message);
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setError(error.message);
      setLoading(false);
    }
  }, []);

  // Global notification listener
  useEffect(() => {
    if (!user || !db) {
      setUnreadNotificationCount(0);
      setNotifications([]);
      return;
    }

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setNotifications(notifs);
          setUnreadNotificationCount(notifs.length);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          // Fallback without orderBy if index doesn't exist
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', user.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const notifs = snapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .filter((n) => !n.read);
                setNotifications(notifs);
                setUnreadNotificationCount(notifs.length);
              },
              (fallbackError) => {
                console.error('Error fetching notifications (fallback):', fallbackError);
              }
            );
            return () => fallbackUnsubscribe();
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up notification listener:', error);
    }
  }, [user]);

  const register = async (email, password, name, phone, role = 'customer') => {
    try {
      if (!auth || !db) {
        throw new Error('Firebase services are not initialized');
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Create user profile in Firestore
      const userProfileData = {
        uid: result.user.uid,
        email: result.user.email,
        name: name || '',
        displayName: name || '',
        phone: phone || '',
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', result.user.uid), userProfileData);

      // Update local state
      setUserProfile(userProfileData);
      setCurrentUserRole(userProfileData.role);

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Function to update user role (admin only)
  const updateUserRole = async (userId, newRole) => {
    try {
      if (!db) {
        throw new Error('Firebase services are not initialized');
      }

      // Check if current user is admin
      if (currentUserRole !== 'admin') {
        throw new Error('Only admins can update user roles');
      }

      const userDocRef = doc(db, 'users', userId);
      await setDoc(
        userDocRef,
        {
          role: newRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // If updating own role, update local state
      if (userId === user?.uid) {
        setCurrentUserRole(newRole);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }

      const result = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user profile
      if (db) {
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile(profileData);
          setCurrentUserRole(profileData.role || 'customer');
        }
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (!auth || !db) {
        throw new Error('Firebase services are not initialized');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if Firestore profile exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        const userProfileData = {
          uid: user.uid,
          name: user.displayName || '',
          displayName: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: 'customer',
          provider: 'google',
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userRef, userProfileData);

        // Update local state
        setUserProfile(userProfileData);
        setCurrentUserRole(userProfileData.role);
      } else {
        // Profile exists, update local state
        const profileData = userSnap.data();
        setUserProfile(profileData);
        setCurrentUserRole(profileData.role || 'customer');
      }

      return user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!auth) {
        console.error('Firebase auth is not initialized');
        setUser(null);
        setUserProfile(null);
        setCurrentUserRole(null);
        return;
      }
      await signOut(auth);
      console.log('User logged out successfully'); // Debug log
      setUserProfile(null);
      setCurrentUserRole(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Still set user to null even if signOut fails
      setUser(null);
      setUserProfile(null);
      setCurrentUserRole(null);
      throw error; // Let calling components handle the error
    }
  };

  // If there's an initialization error, show error UI instead of blank screen
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full card-base p-6 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-2">Firebase Configuration Error</h1>
          <p className="text-textSecondary mb-4">{error}</p>
          <p className="text-sm text-textSecondary mb-4">
            Please check your .env file and ensure all Firebase environment variables are set
            correctly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryDark transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user, // Alias for user
        userProfile,
        currentUserRole,
        loading,
        register,
        login,
        loginWithGoogle,
        logout,
        updateUserRole,
        error,
        unreadNotificationCount,
        notifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
