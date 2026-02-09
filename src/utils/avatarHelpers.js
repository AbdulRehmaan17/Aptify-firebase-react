/**
 * Avatar Resolution Utility
 * 
 * Guaranteed avatar URL resolution with multiple fallback strategies.
 * Handles Google OAuth photoURL, providerData, and generated fallbacks.
 * 
 * @param {Object} options - Resolution options
 * @param {string|null|undefined} options.photoURL - Primary photoURL from user or profile
 * @param {Object|null|undefined} options.user - Firebase Auth user object
 * @param {Object|null|undefined} options.userProfile - Firestore user profile
 * @param {string} options.displayName - User display name for generated avatar
 * @param {string} options.email - User email for generated avatar
 * @returns {string} - Resolved avatar URL (never null/undefined)
 */

/**
 * Resolve avatar URL with guaranteed fallback chain
 * Priority:
 * 1. userProfile.photoURL (Firestore)
 * 2. user.photoURL (Firebase Auth)
 * 3. user.providerData[0].photoURL (Google provider data)
 * 4. Generated avatar from initials
 */
export const resolveAvatarUrl = ({ photoURL, user, userProfile, displayName, email }) => {
  // Priority 1: Firestore profile photoURL
  if (userProfile?.photoURL && typeof userProfile.photoURL === 'string' && userProfile.photoURL.trim()) {
    return userProfile.photoURL;
  }

  // Priority 2: Firebase Auth user.photoURL
  if (photoURL && typeof photoURL === 'string' && photoURL.trim()) {
    return photoURL;
  }

  if (user) {
    // Priority 2b: Direct user.photoURL
    if (user.photoURL && typeof user.photoURL === 'string' && user.photoURL.trim()) {
      return user.photoURL;
    }

    // Priority 3: Provider data photoURL (Google OAuth)
    if (user.providerData && Array.isArray(user.providerData) && user.providerData.length > 0) {
      const googleProvider = user.providerData.find(
        (provider) => provider.providerId === 'google.com' && provider.photoURL
      );
      if (googleProvider?.photoURL && typeof googleProvider.photoURL === 'string' && googleProvider.photoURL.trim()) {
        return googleProvider.photoURL;
      }

      // Fallback: Any provider with photoURL
      const anyProvider = user.providerData.find(
        (provider) => provider.photoURL && typeof provider.photoURL === 'string' && provider.photoURL.trim()
      );
      if (anyProvider?.photoURL) {
        return anyProvider.photoURL;
      }
    }
  }

  // Priority 4: Generated avatar from initials
  const name = displayName || userProfile?.displayName || userProfile?.name || user?.displayName || email?.split('@')[0] || 'User';
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128`;
};

/**
 * Add safe cache-busting to image URLs
 * Prevents browser caching issues while maintaining stability
 * 
 * @param {string} url - Image URL
 * @param {boolean} forceRefresh - Force immediate refresh (default: false)
 * @returns {string} - URL with cache-busting parameter
 */
export const addCacheBuster = (url, forceRefresh = false) => {
  if (!url || typeof url !== 'string') return url;

  try {
    const urlObj = new URL(url);
    
    // For Google images, use hourly cache-bust (or immediate if forced)
    if (urlObj.hostname.includes('googleusercontent.com')) {
      const cacheValue = forceRefresh 
        ? Date.now().toString() 
        : Math.floor(Date.now() / 3600000).toString(); // Hourly
      urlObj.searchParams.set('v', cacheValue);
    } else {
      // For other images, use stable cache-bust based on URL
      const stableValue = urlObj.pathname.split('/').pop() || '1';
      if (!urlObj.searchParams.has('v')) {
        urlObj.searchParams.set('v', stableValue);
      }
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, append safe cache-buster
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=1`;
  }
};

/**
 * Verify if an image URL is accessible
 * Returns true if URL looks valid, false if obviously invalid
 * 
 * @param {string} url - Image URL to verify
 * @returns {boolean} - True if URL appears valid
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it's a valid URL format
  try {
    const urlObj = new URL(trimmed);
    // Must be http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    return true;
  } catch {
    return false;
  }
};

/**
 * Get safe avatar URL with all fallbacks applied
 * This is the main function to use for rendering avatars
 * 
 * @param {Object} options - Resolution options
 * @returns {string} - Guaranteed valid avatar URL
 */
export const getSafeAvatarUrl = (options) => {
  const resolved = resolveAvatarUrl(options);
  
  // Add cache-busting for Google images
  if (resolved.includes('googleusercontent.com')) {
    return addCacheBuster(resolved, false);
  }
  
  return resolved;
};







