import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './index';

/**
 * Upload an image file to Firebase Storage
 * @param {File|Blob} file - The image file to upload
 * @param {string} path - Storage path (e.g., 'images/properties/')
 * @param {string} fileName - Optional custom file name (if not provided, uses file name)
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
export const uploadImage = async (file, path, fileName = null) => {
  try {
    if (!storage) {
      throw new Error('Storage is not initialized');
    }

    if (!file) {
      throw new Error('No file provided');
    }

    // Generate file name if not provided
    const finalFileName = fileName || file.name || `image_${Date.now()}`;
    
    // Ensure path ends with /
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    // Create storage reference
    const storageRef = ref(storage, `${normalizedPath}${finalFileName}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 * @param {Array<File|Blob>} files - Array of image files
 * @param {string} path - Storage path
 * @returns {Promise<Array<string>>} - Array of download URLs
 */
export const uploadMultipleImages = async (files, path) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadPromises = files.map((file, index) => {
      const fileName = file.name || `image_${Date.now()}_${index}`;
      return uploadImage(file, path, fileName);
    });

    const downloadURLs = await Promise.all(uploadPromises);
    return downloadURLs;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} imageUrl - Full URL or storage path of the image
 * @returns {Promise<void>}
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!storage) {
      throw new Error('Storage is not initialized');
    }

    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    // Extract storage path from URL if full URL is provided
    let storagePath = imageUrl;
    
    // If it's a full URL, extract the path
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      // Extract path from URL
      const urlParts = imageUrl.split('/o/');
      if (urlParts.length > 1) {
        const pathPart = urlParts[1].split('?')[0];
        storagePath = decodeURIComponent(pathPart);
      }
    }

    // Create storage reference
    const imageRef = ref(storage, storagePath);

    // Delete the file
    await deleteObject(imageRef);
  } catch (error) {
    // If file doesn't exist, that's okay - just log it
    if (error.code === 'storage/object-not-found') {
      console.warn('Image not found in storage:', imageUrl);
      return;
    }
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 * @param {Array<string>} imageUrls - Array of image URLs or paths
 * @returns {Promise<void>}
 */
export const deleteMultipleImages = async (imageUrls) => {
  try {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No image URLs provided');
    }

    const deletePromises = imageUrls.map((url) => deleteImage(url));
    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Get download URL for an existing file
 * @param {string} storagePath - Storage path of the file
 * @returns {Promise<string>} - Download URL
 */
export const getImageUrl = async (storagePath) => {
  try {
    if (!storage) {
      throw new Error('Storage is not initialized');
    }

    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
};







