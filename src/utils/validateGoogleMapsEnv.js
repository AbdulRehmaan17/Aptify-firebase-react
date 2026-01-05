/**
 * Validate Google Maps API Key at Runtime
 * 
 * This utility checks if the Google Maps API key is configured
 * and provides user-friendly error messages
 * 
 * IMPORTANT: Vite environment variables are only available at build time.
 * Changes to .env files require a dev server restart to take effect.
 * 
 * @deprecated Use validateGoogleMapsConfig from src/config/googleMapsConfig.js instead
 * This file is kept for backward compatibility
 */

/**
 * Safely get API key from environment
 * @returns {string|null}
 */
const getAPIKey = () => {
  try {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Explicitly check for undefined (most common issue)
    if (key === undefined) {
      if (import.meta.env.DEV) {
        console.error('❌ VITE_GOOGLE_MAPS_API_KEY is undefined. This means:');
        console.error('   1. Variable not in .env.local file, OR');
        console.error('   2. Dev server not restarted after adding variable, OR');
        console.error('   3. Variable name misspelled');
        console.error('   Run: window.validateGoogleMapsKey() for detailed diagnostics');
      }
      return null;
    }
    
    // Handle null, empty string, and placeholder values
    if (!key || typeof key !== 'string') {
      if (import.meta.env.DEV && key !== undefined) {
        console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY is not a string:', typeof key, key);
      }
      return null;
    }
    
    const trimmed = key.trim();
    if (trimmed === '' || trimmed === 'YOUR_GOOGLE_MAPS_API_KEY') {
      if (import.meta.env.DEV) {
        console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY is empty or placeholder');
      }
      return null;
    }
    
    return trimmed;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('❌ Error reading Google Maps API key:', e);
      console.error('   Run: window.validateGoogleMapsKey() for diagnostics');
    }
    return null;
  }
};

/**
 * Validate Google Maps API key configuration
 * @returns {{ valid: boolean, message: string | null, apiKey: string | null }}
 */
export const validateGoogleMapsAPIKey = () => {
  const apiKey = getAPIKey();

  // Check if API key exists and is not a placeholder
  if (!apiKey) {
    return {
      valid: false,
      message: 'Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file and restart the dev server.',
      apiKey: null,
    };
  }

  // Basic format validation (Google API keys are typically 39+ characters)
  // But we'll be lenient and only check for obviously invalid keys
  if (apiKey.length < 10) {
    return {
      valid: false,
      message: 'Google Maps API key appears to be invalid (too short). Please check your configuration.',
      apiKey: null,
    };
  }

  // Check for common placeholder patterns
  const placeholderPatterns = [
    'YOUR_',
    'PLACEHOLDER',
    'EXAMPLE',
    'REPLACE',
  ];
  
  const upperKey = apiKey.toUpperCase();
  if (placeholderPatterns.some(pattern => upperKey.includes(pattern))) {
    return {
      valid: false,
      message: 'Google Maps API key appears to be a placeholder. Please set a valid API key.',
      apiKey: null,
    };
  }

  return {
    valid: true,
    message: null,
    apiKey: apiKey,
  };
};

/**
 * Get user-friendly error message for missing API key
 * @returns {string | null}
 */
export const getGoogleMapsErrorMessage = () => {
  const validation = validateGoogleMapsAPIKey();
  if (!validation.valid) {
    return validation.message;
  }
  return null;
};

/**
 * Check if API key is configured (simple boolean check)
 * @returns {boolean}
 */
export const isGoogleMapsAPIKeyConfigured = () => {
  return validateGoogleMapsAPIKey().valid;
};

