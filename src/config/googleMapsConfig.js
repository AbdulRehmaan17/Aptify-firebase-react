/**
 * Google Maps Configuration
 * 
 * Centralized configuration for Google Maps API
 * All Google Maps code should use this module to access the API key
 * 
 * IMPORTANT: This module uses import.meta.env.VITE_GOOGLE_MAPS_API_KEY
 * which is the ONLY way to access environment variables in Vite.
 * 
 * For FYP: This provides a single source of truth for Google Maps configuration
 */

/**
 * Get Google Maps API key from environment
 * @returns {string|null} API key or null if not configured
 */
export const getGoogleMapsAPIKey = () => {
  try {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Explicitly check for undefined (most common issue)
    if (key === undefined) {
      return null;
    }
    
    // Handle null, empty string, and placeholder values
    if (!key || typeof key !== 'string') {
      return null;
    }
    
    const trimmed = key.trim();
    if (trimmed === '' || trimmed === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return null;
    }
    
    return trimmed;
  } catch (e) {
    return null;
  }
};

/**
 * Check if Google Maps API key is configured
 * @returns {boolean}
 */
export const isGoogleMapsConfigured = () => {
  const key = getGoogleMapsAPIKey();
  return key !== null && key.length >= 10;
};

/**
 * Validate Google Maps API key configuration
 * @returns {{ valid: boolean, error: string | null, apiKey: string | null }}
 */
export const validateGoogleMapsConfig = () => {
  const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const apiKey = getGoogleMapsAPIKey();
  
  // Check if undefined (most common issue)
  if (rawKey === undefined) {
    return {
      valid: false,
      error: 'VITE_GOOGLE_MAPS_API_KEY is undefined. This means:\n' +
             '1. Variable not in .env.local file, OR\n' +
             '2. Dev server not restarted after adding variable, OR\n' +
             '3. Variable name misspelled (must be exactly: VITE_GOOGLE_MAPS_API_KEY)',
      apiKey: null
    };
  }
  
  // Check if empty or placeholder
  if (!apiKey) {
    if (rawKey === '') {
      return {
        valid: false,
        error: 'VITE_GOOGLE_MAPS_API_KEY is an empty string. Please set a valid API key.',
        apiKey: null
      };
    }
    if (rawKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return {
        valid: false,
        error: 'VITE_GOOGLE_MAPS_API_KEY is still a placeholder. Please replace with your actual API key.',
        apiKey: null
      };
    }
    return {
      valid: false,
      error: 'VITE_GOOGLE_MAPS_API_KEY is not a valid string.',
      apiKey: null
    };
  }
  
  // Check length
  if (apiKey.length < 10) {
    return {
      valid: false,
      error: `VITE_GOOGLE_MAPS_API_KEY is too short (${apiKey.length} chars). Google Maps API keys are typically 39+ characters.`,
      apiKey: null
    };
  }
  
  return {
    valid: true,
    error: null,
    apiKey: apiKey
  };
};

/**
 * Get user-friendly error message for missing API key
 * @returns {string | null}
 */
export const getGoogleMapsErrorMessage = () => {
  const validation = validateGoogleMapsConfig();
  if (!validation.valid) {
    return validation.error;
  }
  return null;
};

/**
 * Environment mode information
 */
export const getEnvInfo = () => {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    apiKeyDefined: import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== undefined,
    apiKeyValid: isGoogleMapsConfigured()
  };
};



