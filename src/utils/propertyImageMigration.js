/**
 * Property Image Migration Utility
 * 
 * One-time migration script to fix invalid image data in existing property documents.
 * 
 * Usage:
 * - Run this script once from admin panel or as a standalone utility
 * - Scans all properties for invalid image fields
 * - Normalizes photos[] and coverImage fields
 * - Adds fallback images where needed
 * 
 * DO NOT run during render - only execute once via controlled migration
 */

import { collection, getDocs, updateDoc, doc, query, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';

// Fallback image URL - using a placeholder service
const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/600x400?text=Property+Image';

/**
 * Check if a value is a valid image URL string
 * @param {any} value - Value to check
 * @returns {boolean}
 */
const isValidImageUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Check if it looks like a URL (starts with http:// or https://)
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

/**
 * Normalize photos array - ensure all items are valid URL strings
 * @param {any} photos - Photos field value
 * @returns {string[]} - Normalized array of URL strings
 */
const normalizePhotos = (photos) => {
  if (!Array.isArray(photos)) {
    return [];
  }
  
  // Filter out invalid values and keep only valid URL strings
  const validPhotos = photos
    .filter((photo) => isValidImageUrl(photo))
    .map((photo) => photo.trim());
  
  return validPhotos;
};

/**
 * Normalize coverImage - ensure it's a valid URL string or null
 * @param {any} coverImage - CoverImage field value
 * @param {string[]} photos - Photos array (used as fallback)
 * @returns {string|null} - Normalized cover image URL or null
 */
const normalizeCoverImage = (coverImage, photos = []) => {
  // If coverImage is valid, use it
  if (isValidImageUrl(coverImage)) {
    return coverImage.trim();
  }
  
  // Otherwise, use first photo if available
  if (photos.length > 0 && isValidImageUrl(photos[0])) {
    return photos[0].trim();
  }
  
  // If no valid images, return null (will use fallback in UI)
  return null;
};

/**
 * Get safe image data for a property
 * @param {Object} propertyData - Property document data
 * @returns {Object} - Normalized image fields
 */
export const getNormalizedImageData = (propertyData) => {
  const photos = normalizePhotos(propertyData.photos);
  const coverImage = normalizeCoverImage(propertyData.coverImage, photos);
  
  return {
    photos,
    coverImage,
  };
};

/**
 * Check if a property needs image migration
 * @param {Object} propertyData - Property document data
 * @returns {boolean}
 */
export const needsImageMigration = (propertyData) => {
  const photos = propertyData.photos;
  const coverImage = propertyData.coverImage;
  
  // Check if photos is not an array
  if (!Array.isArray(photos)) {
    return true;
  }
  
  // Check if photos contains non-string values
  const hasInvalidPhotos = photos.some((photo) => !isValidImageUrl(photo));
  if (hasInvalidPhotos) {
    return true;
  }
  
  // Check if coverImage is invalid (not null and not a valid URL)
  if (coverImage !== null && !isValidImageUrl(coverImage)) {
    return true;
  }
  
  // Check if coverImage is null but photos exist
  if (coverImage === null && photos.length > 0 && isValidImageUrl(photos[0])) {
    return true; // Should set coverImage from first photo
  }
  
  return false;
};

/**
 * Migrate a single property document
 * @param {string} propertyId - Property document ID
 * @param {Object} propertyData - Property document data
 * @param {boolean} addFallback - Whether to add fallback image if no images exist
 * @returns {Promise<Object>} - Migration result
 */
export const migratePropertyImages = async (propertyId, propertyData, addFallback = false) => {
  try {
    const normalized = getNormalizedImageData(propertyData);
    
    // If no images and addFallback is true, add fallback
    if (addFallback && normalized.photos.length === 0 && !normalized.coverImage) {
      normalized.coverImage = FALLBACK_IMAGE_URL;
    }
    
    // Only update if there are changes
    const hasChanges = 
      JSON.stringify(normalized.photos) !== JSON.stringify(propertyData.photos || []) ||
      normalized.coverImage !== (propertyData.coverImage || null);
    
    if (!hasChanges) {
      return {
        propertyId,
        migrated: false,
        reason: 'No changes needed',
      };
    }
    
    // Update Firestore document
    const propertyRef = doc(db, 'properties', propertyId);
    await updateDoc(propertyRef, {
      photos: normalized.photos,
      coverImage: normalized.coverImage,
      // Add migration marker to track that this property was migrated
      _imageMigrationDate: new Date().toISOString(),
    });
    
    return {
      propertyId,
      migrated: true,
      changes: {
        photos: {
          before: propertyData.photos,
          after: normalized.photos,
        },
        coverImage: {
          before: propertyData.coverImage,
          after: normalized.coverImage,
        },
      },
    };
  } catch (error) {
    console.error(`Error migrating property ${propertyId}:`, error);
    return {
      propertyId,
      migrated: false,
      error: error.message,
    };
  }
};

/**
 * Migrate all properties in batches
 * @param {Object} options - Migration options
 * @param {boolean} options.addFallback - Add fallback image if no images exist
 * @param {number} options.batchSize - Number of properties to process per batch
 * @param {Function} options.onProgress - Progress callback (propertyId, result)
 * @returns {Promise<Object>} - Migration summary
 */
export const migrateAllProperties = async ({
  addFallback = false,
  batchSize = 50,
  onProgress = null,
} = {}) => {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }
  
  const results = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };
  
  try {
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      // Fetch batch of properties
      let q = query(collection(db, 'properties'), limit(batchSize));
      if (lastDoc) {
        q = query(collection(db, 'properties'), startAfter(lastDoc), limit(batchSize));
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      // Process each property
      for (const docSnap of snapshot.docs) {
        results.total++;
        const propertyData = docSnap.data();
        const propertyId = docSnap.id;
        
        // Check if migration is needed
        if (!needsImageMigration(propertyData)) {
          results.skipped++;
          if (onProgress) {
            onProgress(propertyId, { migrated: false, reason: 'No changes needed' });
          }
          continue;
        }
        
        // Migrate property
        const result = await migratePropertyImages(propertyId, propertyData, addFallback);
        
        if (result.migrated) {
          results.migrated++;
        } else if (result.error) {
          results.errors++;
        } else {
          results.skipped++;
        }
        
        results.details.push(result);
        
        if (onProgress) {
          onProgress(propertyId, result);
        }
      }
      
      // Update pagination
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length === batchSize;
    }
    
    return results;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

/**
 * Get migration statistics without making changes
 * @returns {Promise<Object>} - Statistics about properties needing migration
 */
export const getMigrationStats = async () => {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }
  
  const stats = {
    total: 0,
    needsMigration: 0,
    hasInvalidPhotos: 0,
    hasInvalidCoverImage: 0,
    missingCoverImage: 0,
    emptyPhotos: 0,
    details: [],
  };
  
  try {
    const snapshot = await getDocs(collection(db, 'properties'));
    
    for (const docSnap of snapshot.docs) {
      stats.total++;
      const propertyData = docSnap.data();
      
      if (needsImageMigration(propertyData)) {
        stats.needsMigration++;
        
        const photos = propertyData.photos;
        const coverImage = propertyData.coverImage;
        
        // Analyze issues
        if (!Array.isArray(photos)) {
          stats.hasInvalidPhotos++;
        } else if (photos.length === 0) {
          stats.emptyPhotos++;
        } else if (photos.some((p) => !isValidImageUrl(p))) {
          stats.hasInvalidPhotos++;
        }
        
        if (coverImage !== null && !isValidImageUrl(coverImage)) {
          stats.hasInvalidCoverImage++;
        } else if (coverImage === null && Array.isArray(photos) && photos.length > 0) {
          stats.missingCoverImage++;
        }
        
        stats.details.push({
          id: docSnap.id,
          title: propertyData.title,
          photos: photos,
          coverImage: coverImage,
        });
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting migration stats:', error);
    throw error;
  }
};

// Export fallback image URL for use in components
export { FALLBACK_IMAGE_URL };

