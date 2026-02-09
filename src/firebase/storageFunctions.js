import { uploadToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

/**
 * Upload an image file to Cloudinary
 * @param {File|Blob} file - The image file to upload
 * @param {string} path - Folder path in Cloudinary (e.g., 'properties', 'users/profile')
 * @param {string} fileName - Optional custom file name (not used in Cloudinary, kept for compatibility)
 * @returns {Promise<string>} - Secure URL of the uploaded image
 */
export const uploadImage = async (file, path, fileName = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Use path as folder in Cloudinary (normalize it)
    const folder = path ? path.replace(/\/+$/, '') : null;

    // Upload to Cloudinary
    const secureUrl = await uploadToCloudinary(file, folder);

    return secureUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<File|Blob>} files - Array of image files
 * @param {string} path - Folder path in Cloudinary
 * @returns {Promise<Array<string>>} - Array of secure URLs
 */
export const uploadMultipleImages = async (files, path) => {
  try {
    // Images are optional - return empty array if no files
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    // Use path as folder in Cloudinary (normalize it)
    const folder = path ? path.replace(/\/+$/, '') : null;

    // Upload to Cloudinary
    const secureUrls = await uploadMultipleToCloudinary(files, folder);

    return secureUrls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    // Surface the error so callers can handle upload failures explicitly
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * Note: Cloudinary deletion requires Admin API (backend only).
 * This function is kept for compatibility but does not perform deletion.
 * @param {string} imageUrl - Full URL of the image
 * @returns {Promise<void>}
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    // Cloudinary deletion requires Admin API which needs API Secret (backend only)
    // For unsigned upload preset, deletion is not supported from frontend
    // This function is kept for compatibility but logs a warning
    console.warn(
      'Image deletion not supported with Cloudinary unsigned upload preset. ' +
      'To delete images, use Cloudinary Admin API on the backend. Image URL:',
      imageUrl
    );
    
    // Return successfully to avoid breaking existing code
    return;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    // Don't throw to avoid breaking existing code
  }
};

/**
 * Delete multiple images from Cloudinary
 * Note: Cloudinary deletion requires Admin API (backend only).
 * This function is kept for compatibility but does not perform deletion.
 * @param {Array<string>} imageUrls - Array of image URLs
 * @returns {Promise<void>}
 */
export const deleteMultipleImages = async (imageUrls) => {
  try {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No image URLs provided');
    }

    // Cloudinary deletion requires Admin API (backend only)
    // This function is kept for compatibility
    const deletePromises = imageUrls.map((url) => deleteImage(url));
    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Error in deleteMultipleImages:', error);
    // Don't throw to avoid breaking existing code
  }
};

/**
 * Get image URL (deprecated - Cloudinary URLs are returned directly)
 * This function is kept for compatibility but returns the input URL as-is.
 * @param {string} storagePath - Image URL (Cloudinary URLs are already complete)
 * @returns {Promise<string>} - Image URL
 */
export const getImageUrl = async (storagePath) => {
  try {
    if (!storagePath) {
      throw new Error('No image path/URL provided');
    }

    // Cloudinary URLs are already complete, so return as-is
    // This maintains compatibility with existing code
    return storagePath;
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
};
