/**
 * Authentication Helper Functions
 * Provides utilities for authentication and profile validation
 */

import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

/**
 * Require authentication and complete profile before navigating
 * Checks if user is authenticated and has a complete profile
 * 
 * @param {Function} navigate - React Router navigate function
 * @param {Object} currentUser - Current Firebase Auth user
 * @param {string} nextPath - Path to navigate to after validation
 * @returns {Promise<boolean>} - Returns true if user can proceed, false otherwise
 */
export const requireAuthAndProfile = async (navigate, currentUser, nextPath) => {
  // If no currentUser, redirect to auth with next parameter
  if (!currentUser) {
    const encodedPath = encodeURIComponent(nextPath);
    navigate(`/auth?next=${encodedPath}`);
    return false;
  }

  try {
    // AUTO-FIXED: Use userProfiles collection per Firestore rules
    const userDocRef = doc(db, 'userProfiles', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Profile doesn't exist, redirect to account to create it
      toast.error('Please complete your profile first');
      navigate('/account');
      return false;
    }

    const userData = userDoc.data();
    
    // Check for required profile fields
    const requiredFields = ['email', 'displayName'];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      // Profile is incomplete, redirect to account
      toast.error('Please complete your profile (name and email required)');
      navigate('/account');
      return false;
    }

    // User is authenticated and profile is complete, proceed
    navigate(nextPath);
    return true;
  } catch (error) {
    console.error('Error checking user profile:', error);
    toast.error('Error verifying profile. Please try again.');
    navigate('/account');
    return false;
  }
};

/**
 * Check if user has complete profile
 * @param {Object} currentUser - Current Firebase Auth user
 * @returns {Promise<boolean>} - Returns true if profile is complete
 */
export const hasCompleteProfile = async (currentUser) => {
  if (!currentUser) return false;

  try {
    // AUTO-FIXED: Use userProfiles collection per Firestore rules
    const userDocRef = doc(db, 'userProfiles', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const requiredFields = ['email', 'displayName'];
    return requiredFields.every(field => userData[field]);
  } catch (error) {
    console.error('Error checking profile:', error);
    return false;
  }
};

/**
 * Check if user is a constructor
 * Checks both user role and serviceProviders document
 * @param {Object} currentUser - Current Firebase Auth user
 * @param {Object} userProfile - User profile data from Firestore (optional, will fetch if not provided)
 * @returns {Promise<boolean>} - Returns true if user is a constructor
 */
export const isConstructor = async (currentUser, userProfile = null) => {
  if (!currentUser || !db) return false;

  try {
    // Get user profile if not provided
    let profile = userProfile;
    if (!profile) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        profile = { id: userDoc.id, ...userDoc.data() };
      }
    }

    // Check if user role is constructor
    if (profile?.role === 'constructor') {
      return true;
    }

    // AUTO-FIXED: Cannot query serviceProviders collection - it's blocked by Firestore rules
    // Users must have role set in userProfiles collection
    return false;
  } catch (error) {
    console.error('Error checking constructor status:', error);
    return false;
  }
};

/**
 * Check if user is a renovator
 * Checks both user role and serviceProviders document
 * @param {Object} currentUser - Current Firebase Auth user
 * @param {Object} userProfile - User profile data from Firestore (optional, will fetch if not provided)
 * @returns {Promise<boolean>} - Returns true if user is a renovator
 */
export const isRenovator = async (currentUser, userProfile = null) => {
  if (!currentUser || !db) return false;

  try {
    // Get user profile if not provided
    let profile = userProfile;
    if (!profile) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        profile = { id: userDoc.id, ...userDoc.data() };
      }
    }

    // Check if user role is renovator
    if (profile?.role === 'renovator') {
      return true;
    }

    // AUTO-FIXED: Cannot query serviceProviders collection - it's blocked by Firestore rules
    // Users must have role set in userProfiles collection
    return false;
  } catch (error) {
    console.error('Error checking renovator status:', error);
    return false;
  }
};

/**
 * Get the appropriate redirect path after login based on user role
 * Priority: constructor → renovator → admin → normal user
 * @param {Object} currentUser - Current Firebase Auth user
 * @param {Object} userProfile - User profile data from Firestore (optional, will fetch if not provided)
 * @param {string} fallbackPath - Fallback path if no specific role (default: '/account')
 * @returns {Promise<string>} - Redirect path
 */
export const getPostLoginRedirectPath = async (currentUser, userProfile = null, fallbackPath = '/account') => {
  if (!currentUser) return fallbackPath;

  try {
    // Get user profile if not provided (with retry for newly created accounts)
    let profile = userProfile;
    if (!profile && db) {
      // Try to fetch profile, with a small retry for newly created accounts
      let retries = 2;
      while (retries > 0) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          profile = { id: userDoc.id, ...userDoc.data() };
          break;
        }
        // Wait a bit before retry (for newly created accounts)
        if (retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        retries--;
      }
    }

    // Check if user is a constructor (highest priority)
    const constructorStatus = await isConstructor(currentUser, profile);
    if (constructorStatus) {
      return '/constructor/dashboard';
    }

    // Check if user is a renovator
    const renovatorStatus = await isRenovator(currentUser, profile);
    if (renovatorStatus) {
      return '/renovator/dashboard';
    }

    // Check if user is admin
    if (profile?.role === 'admin') {
      return '/admin';
    }

    // Default to account for normal users
    return fallbackPath;
  } catch (error) {
    console.error('Error determining redirect path:', error);
    return fallbackPath;
  }
};

