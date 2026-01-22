/**
 * STORAGE LAYER
 * Cloudinary is used ONLY for media storage.
 * Firebase Auth and Firestore remain unchanged.
 * DO NOT reintroduce Firebase Storage.
 */

/**
 * Cloudinary Upload Utility
 * 
 * Handles image uploads to Cloudinary using unsigned upload preset.
 * This replaces Firebase Storage for image uploads.
 * 
 * Environment variables required:
 * - VITE_CLOUDINARY_CLOUD_NAME
 * - VITE_CLOUDINARY_UPLOAD_PRESET
 */

/**
 * Upload a single image file to Cloudinary
 * @param {File|Blob} file - The image file to upload
 * @param {string} folder - Optional folder path in Cloudinary (e.g., 'properties', 'users/profile')
 * @returns {Promise<string>} - Secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file, folder = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        'Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your environment variables.'
      );
    }

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Add folder if provided
    if (folder) {
      // Normalize folder path (remove leading/trailing slashes)
      const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
      if (normalizedFolder) {
        formData.append('folder', normalizedFolder);
      }
    }

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Upload failed with status ${response.status}`
      );
    }

    const data = await response.json();

    // Return secure_url from Cloudinary response
    if (!data.secure_url) {
      throw new Error('Cloudinary response missing secure_url');
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<File|Blob>} files - Array of image files
 * @param {string} folder - Optional folder path in Cloudinary
 * @returns {Promise<Array<string>>} - Array of secure URLs
 */
export const uploadMultipleToCloudinary = async (files, folder = null) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    const uploadPromises = files
      .filter((file) => file instanceof File || file instanceof Blob)
      .map(async (file, index) => {
        try {
          return await uploadToCloudinary(file, folder);
        } catch (fileError) {
          console.error(`Error uploading file ${index}:`, fileError);
          // Continue with other files even if one fails
          return null;
        }
      });

    const secureUrls = await Promise.all(uploadPromises);
    // Filter out null results (failed uploads)
    return secureUrls.filter((url) => url !== null && typeof url === 'string');
  } catch (error) {
    console.error('Error uploading multiple images to Cloudinary:', error);
    // Return empty array to allow form submission to continue
    return [];
  }
};

