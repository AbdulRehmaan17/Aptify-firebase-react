import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';

const USERS_COLLECTION = 'users';

/**
 * User Service Class
 * Handles user profile updates and data management
 */
class UserService {
  /**
   * Get user profile by ID
   * @param {string} userId - User document ID (Firebase Auth UID)
   * @returns {Promise<Object>} - User profile data
   */
  async getProfile(userId) {
    try {
      if (!userId) throw new Error('User ID is required');

      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      return { id: userSnap.id, ...userSnap.data() };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(error.message || 'Failed to fetch user profile');
    }
  }

  /**
   * Update user profile
   * Only allows users to update their own profile
   * @param {string} userId - User document ID (must match authenticated user)
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateProfile(userId, updates) {
    try {
      if (!userId) throw new Error('User ID is required');

      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      // Prepare update data
      const updateData = {
        updatedAt: serverTimestamp(),
      };

      // Allowed fields that users can update
      const allowedFields = [
        'name',
        'displayName',
        'phone',
        'phoneNumber',
        'photoURL',
        'address',
        'bio',
        'preferences',
        'notificationPrefs',
      ];

      // Filter and validate updates
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = updates[key];
        } else if (key === 'email' || key === 'role' || key === 'isAdmin') {
          // Prevent users from updating restricted fields
          console.warn(`Field '${key}' cannot be updated by user. Contact admin for changes.`);
        }
      });

      // Handle address updates
      if (updates.address && typeof updates.address === 'object') {
        updateData.address = {
          ...(userSnap.data().address || {}),
          ...updates.address,
        };
      }

      // Handle notification preferences
      if (updates.notificationPrefs && typeof updates.notificationPrefs === 'object') {
        updateData.notificationPrefs = {
          ...(userSnap.data().notificationPrefs || {}),
          ...updates.notificationPrefs,
        };
      }

      // Update document
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update user profile');
    }
  }

  /**
   * Upload profile image
   * @param {string} userId - User document ID
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<string>} - Download URL of uploaded image
   */
  async uploadProfileImage(userId, imageFile) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!(imageFile instanceof File)) {
        throw new Error('Invalid image file');
      }

      const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const imageRef = storageRef(storage, `users/${userId}/profile/${fileName}`);

      await uploadBytes(imageRef, imageFile);
      const downloadURL = await getDownloadURL(imageRef);

      // Update user profile with new photo URL
      await this.updateProfile(userId, { photoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw new Error(error.message || 'Failed to upload profile image');
    }
  }

  /**
   * Delete profile image
   * @param {string} userId - User document ID
   * @param {string} imageUrl - URL of image to delete (optional, uses current photoURL if not provided)
   * @returns {Promise<void>}
   */
  async deleteProfileImage(userId, imageUrl = null) {
    try {
      if (!userId) throw new Error('User ID is required');

      let urlToDelete = imageUrl;

      // If no URL provided, get current photoURL
      if (!urlToDelete) {
        const profile = await this.getProfile(userId);
        urlToDelete = profile.photoURL;
      }

      if (!urlToDelete) {
        throw new Error('No image URL provided or found in profile');
      }

      // Extract path from URL
      const urlParts = urlToDelete.split('/');
      const pathIndex = urlParts.findIndex(part => part === 'users');
      if (pathIndex === -1) {
        throw new Error('Invalid image URL format');
      }

      const path = urlParts.slice(pathIndex).join('/');
      const imageRef = storageRef(storage, path);

      await deleteObject(imageRef);

      // Update user profile to remove photo URL
      await this.updateProfile(userId, { photoURL: null });
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw new Error(error.message || 'Failed to delete profile image');
    }
  }

  /**
   * Update user address
   * @param {string} userId - User document ID
   * @param {Object} address - Address object
   * @returns {Promise<void>}
   */
  async updateAddress(userId, address) {
    try {
      await this.updateProfile(userId, { address });
    } catch (error) {
      console.error('Error updating address:', error);
      throw new Error(error.message || 'Failed to update address');
    }
  }

  /**
   * Update user phone number
   * @param {string} userId - User document ID
   * @param {string} phone - Phone number
   * @returns {Promise<void>}
   */
  async updatePhone(userId, phone) {
    try {
      await this.updateProfile(userId, { phone, phoneNumber: phone });
    } catch (error) {
      console.error('Error updating phone:', error);
      throw new Error(error.message || 'Failed to update phone');
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User document ID
   * @param {Object} preferences - Notification preferences object
   * @returns {Promise<void>}
   */
  async updateNotificationPrefs(userId, preferences) {
    try {
      await this.updateProfile(userId, { notificationPrefs: preferences });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error(error.message || 'Failed to update notification preferences');
    }
  }

  /**
   * Update user bio
   * @param {string} userId - User document ID
   * @param {string} bio - Bio text
   * @returns {Promise<void>}
   */
  async updateBio(userId, bio) {
    try {
      await this.updateProfile(userId, { bio });
    } catch (error) {
      console.error('Error updating bio:', error);
      throw new Error(error.message || 'Failed to update bio');
    }
  }

  /**
   * Add property to user's favorites
   * @param {string} userId - User document ID
   * @param {string} propertyId - Property document ID
   * @returns {Promise<void>}
   */
  async addToFavorites(userId, propertyId) {
    try {
      if (!userId || !propertyId) {
        throw new Error('User ID and Property ID are required');
      }

      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const favorites = userSnap.data().favorites || [];

      if (!favorites.includes(propertyId)) {
        await updateDoc(userRef, {
          favorites: [...favorites, propertyId],
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw new Error(error.message || 'Failed to add to favorites');
    }
  }

  /**
   * Remove property from user's favorites
   * @param {string} userId - User document ID
   * @param {string} propertyId - Property document ID
   * @returns {Promise<void>}
   */
  async removeFromFavorites(userId, propertyId) {
    try {
      if (!userId || !propertyId) {
        throw new Error('User ID and Property ID are required');
      }

      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const favorites = userSnap.data().favorites || [];
      const updatedFavorites = favorites.filter(id => id !== propertyId);

      await updateDoc(userRef, {
        favorites: updatedFavorites,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw new Error(error.message || 'Failed to remove from favorites');
    }
  }

  /**
   * Get user's favorite properties
   * @param {string} userId - User document ID
   * @returns {Promise<Array>} - Array of property IDs
   */
  async getFavorites(userId) {
    try {
      const profile = await this.getProfile(userId);
      return profile.favorites || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw new Error(error.message || 'Failed to fetch favorites');
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;

