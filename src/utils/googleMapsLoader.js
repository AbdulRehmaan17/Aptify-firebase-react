/**
 * Google Maps API Loader Utility
 * 
 * Handles loading Google Maps JavaScript API dynamically
 * Ensures API is loaded only once and provides error handling
 * 
 * For FYP: This utility manages the Google Maps API script loading
 * to prevent multiple script tags and handle loading errors gracefully
 */

let isLoaded = false;
let isLoading = false;
let loadPromise = null;
let loadError = null;

/**
 * Safely check if window.google exists
 * @returns {boolean}
 */
const hasGoogleMaps = () => {
  try {
    return typeof window !== 'undefined' && 
           window.google && 
           window.google.maps && 
           typeof window.google.maps === 'object';
  } catch (e) {
    return false;
  }
};

/**
 * Load Google Maps JavaScript API
 * @returns {Promise<boolean>} - Returns true if loaded successfully, false otherwise
 */
export const loadGoogleMapsAPI = () => {
  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Return resolved promise if already loaded
  if (isLoaded && hasGoogleMaps()) {
    return Promise.resolve(true);
  }

  // Return rejected promise if previous load failed
  if (loadError) {
    return Promise.resolve(false);
  }

  // Safely get API key from environment with detailed error reporting
  let apiKey;
  try {
    const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Explicitly check for undefined first (most common issue)
    if (rawKey === undefined) {
      if (import.meta.env.DEV) {
        console.error('❌ VITE_GOOGLE_MAPS_API_KEY is undefined');
        console.error('   This means the variable is not being loaded by Vite.');
        console.error('   Possible causes:');
        console.error('   1. Variable not in .env.local file');
        console.error('   2. Dev server not restarted after adding variable');
        console.error('   3. Variable name misspelled (must be exactly: VITE_GOOGLE_MAPS_API_KEY)');
        console.error('   4. File is .env instead of .env.local');
        console.error('   Run: window.validateGoogleMapsKey() for detailed diagnostics');
      }
      apiKey = null;
    } else if (!rawKey || typeof rawKey !== 'string') {
      if (import.meta.env.DEV) {
        console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY is not a string:', typeof rawKey);
      }
      apiKey = null;
    } else {
      const trimmed = rawKey.trim();
      if (trimmed === '' || trimmed === 'YOUR_GOOGLE_MAPS_API_KEY') {
        if (import.meta.env.DEV) {
          console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY is empty or placeholder');
        }
        apiKey = null;
      } else {
        apiKey = trimmed;
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('❌ Error reading Google Maps API key:', e);
      console.error('   Run: window.validateGoogleMapsKey() for diagnostics');
    }
    apiKey = null;
  }

  // Check if API key is configured
  if (!apiKey) {
    // Provide detailed error message in dev mode
    if (import.meta.env.DEV) {
      console.error('❌ Google Maps API key is not configured.');
      console.error('   Fix:');
      console.error('   1. Create/update .env.local in project root');
      console.error('   2. Add: VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here');
      console.error('   3. Restart dev server: npm run dev');
      console.error('   Run: window.validateEnvVars() to see all environment variables');
    }
    loadError = new Error('API key not configured');
    return Promise.resolve(false);
  }

  // Basic validation - check for obviously invalid keys
  if (apiKey.length < 10) {
    if (import.meta.env.DEV) {
      console.error('❌ Google Maps API key appears to be invalid (too short: ' + apiKey.length + ' chars)');
      console.error('   Google Maps API keys are typically 39+ characters long.');
      console.error('   Please verify you copied the complete API key.');
    }
    loadError = new Error('API key appears invalid');
    return Promise.resolve(false);
  }

  isLoading = true;
  loadError = null;

  loadPromise = new Promise((resolve) => {
    try {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Script exists, check if already loaded
        if (hasGoogleMaps()) {
          isLoaded = true;
          isLoading = false;
          resolve(true);
          return;
        }
        
        // Wait for load event with timeout
        const timeout = setTimeout(() => {
          isLoading = false;
          loadError = new Error('Timeout waiting for Google Maps API');
          resolve(false);
        }, 10000); // 10 second timeout
        
        const onLoad = () => {
          clearTimeout(timeout);
          if (hasGoogleMaps()) {
            isLoaded = true;
            isLoading = false;
            resolve(true);
          } else {
            isLoading = false;
            loadError = new Error('Google Maps API loaded but not available');
            resolve(false);
          }
        };
        
        const onError = () => {
          clearTimeout(timeout);
          isLoading = false;
          loadError = new Error('Failed to load Google Maps API script');
          if (import.meta.env.DEV) {
            console.error('❌ Failed to load Google Maps API. Please check your API key and network connection.');
          }
          resolve(false);
        };
        
        existingScript.addEventListener('load', onLoad, { once: true });
        existingScript.addEventListener('error', onError, { once: true });
        
        // If script already loaded, check immediately
        if (existingScript.complete || existingScript.readyState === 'complete') {
          setTimeout(() => {
            if (hasGoogleMaps()) {
              onLoad();
            } else {
              onError();
            }
          }, 100);
        }
        
        return;
      }

      // Create and inject script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      const timeout = setTimeout(() => {
        isLoading = false;
        loadError = new Error('Timeout loading Google Maps API');
        if (import.meta.env.DEV) {
          console.error('❌ Google Maps API load timeout');
        }
        resolve(false);
      }, 15000); // 15 second timeout
      
      script.onload = () => {
        clearTimeout(timeout);
        // Double check that API is actually available
        setTimeout(() => {
          if (hasGoogleMaps()) {
            isLoaded = true;
            isLoading = false;
            resolve(true);
          } else {
            isLoading = false;
            loadError = new Error('Google Maps API loaded but not available');
            resolve(false);
          }
        }, 100);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        isLoading = false;
        loadError = new Error('Failed to load Google Maps API script');
        if (import.meta.env.DEV) {
          console.error('❌ Failed to load Google Maps API. Please check your API key and network connection.');
        }
        resolve(false);
      };
      
      document.head.appendChild(script);
    } catch (err) {
      isLoading = false;
      loadError = err;
      if (import.meta.env.DEV) {
        console.error('❌ Error loading Google Maps API:', err);
      }
      resolve(false);
    }
  });

  return loadPromise;
};

/**
 * Check if Google Maps API is loaded
 * @returns {boolean}
 */
export const isGoogleMapsLoaded = () => {
  try {
    return isLoaded && hasGoogleMaps();
  } catch (e) {
    return false;
  }
};

/**
 * Check if Places API is available
 * @returns {boolean}
 */
export const isPlacesAPILoaded = () => {
  try {
    return isGoogleMapsLoaded() && 
           window.google.maps.places && 
           typeof window.google.maps.places === 'object';
  } catch (e) {
    return false;
  }
};

/**
 * Get Google Maps API key from environment
 * @returns {string|null}
 * @deprecated Use getGoogleMapsAPIKey from src/config/googleMapsConfig.js instead
 */
export const getGoogleMapsAPIKey = () => {
  // Direct access (synchronous) - config module is for validation only
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || typeof key !== 'string') {
    return null;
  }
  const trimmed = key.trim();
  if (trimmed === '' || trimmed === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return null;
  }
  return trimmed;
};

