/**
 * Environment Variable Validator
 * 
 * Validates all required environment variables at application startup
 * Provides clear, actionable error messages for missing or invalid variables
 * 
 * IMPORTANT: Vite only exposes environment variables that:
 * 1. Start with VITE_ prefix
 * 2. Are in .env, .env.local, or .env.[mode] files (in project root)
 * 3. Are loaded when the dev server starts (restart required after changes)
 * 
 * File Priority (Vite loads in this order):
 * - .env.[mode].local (highest priority)
 * - .env.local
 * - .env.[mode]
 * - .env (lowest priority)
 */

/**
 * Get all VITE_ prefixed environment variables
 * @returns {Object} Object with all VITE_ env vars
 */
export const getAllViteEnvVars = () => {
  const viteVars = {};
  try {
    // Get all keys from import.meta.env
    const allKeys = Object.keys(import.meta.env);
    
    // Filter for VITE_ prefixed vars
    allKeys.forEach(key => {
      if (key.startsWith('VITE_')) {
        viteVars[key] = import.meta.env[key];
      }
    });
  } catch (e) {
    console.error('Error reading environment variables:', e);
  }
  
  return viteVars;
};

/**
 * Validate Google Maps API key specifically
 * @returns {{ valid: boolean, value: string | null, error: string | null }}
 */
export const validateGoogleMapsAPIKey = () => {
  const varName = 'VITE_GOOGLE_MAPS_API_KEY';
  
  try {
    const value = import.meta.env[varName];
    
    // Check if variable exists
    if (value === undefined) {
      return {
        valid: false,
        value: null,
        error: `Environment variable ${varName} is undefined. This means:\n` +
               `1. The variable is not in your .env.local file, OR\n` +
               `2. The dev server was not restarted after adding it, OR\n` +
               `3. The variable name is misspelled (must be exactly: ${varName})`
      };
    }
    
    // Check if it's a string
    if (typeof value !== 'string') {
      return {
        valid: false,
        value: value,
        error: `Environment variable ${varName} is not a string (type: ${typeof value}). This is unusual.`
      };
    }
    
    // Check if it's empty
    const trimmed = value.trim();
    if (trimmed === '') {
      return {
        valid: false,
        value: null,
        error: `Environment variable ${varName} is an empty string. Please set a valid API key.`
      };
    }
    
    // Check if it's a placeholder
    if (trimmed === 'YOUR_GOOGLE_MAPS_API_KEY' || 
        trimmed.toUpperCase().includes('YOUR_') ||
        trimmed.toUpperCase().includes('PLACEHOLDER')) {
      return {
        valid: false,
        value: null,
        error: `Environment variable ${varName} contains a placeholder value. Please replace it with your actual Google Maps API key.`
      };
    }
    
    // Check minimum length
    if (trimmed.length < 10) {
      return {
        valid: false,
        value: trimmed.substring(0, 5) + '...',
        error: `Environment variable ${varName} is too short (${trimmed.length} chars). Google Maps API keys are typically 39+ characters.`
      };
    }
    
    // Valid key
    return {
      valid: true,
      value: trimmed,
      error: null
    };
    
  } catch (e) {
    return {
      valid: false,
      value: null,
      error: `Error reading ${varName}: ${e.message}`
    };
  }
};

/**
 * Comprehensive environment variable validation
 * Logs all findings to console
 */
export const validateAllEnvVars = () => {
  console.group('🔍 Environment Variables Validation');
  
  // Get all VITE_ vars
  const allVars = getAllViteEnvVars();
  console.log('📋 All VITE_ environment variables found:', Object.keys(allVars));
  
  // Check Google Maps API key specifically
  const mapsKeyValidation = validateGoogleMapsAPIKey();
  
  if (mapsKeyValidation.valid) {
    console.log('✅ Google Maps API Key:', 'Configured (length: ' + mapsKeyValidation.value.length + ' chars)');
  } else {
    console.error('❌ Google Maps API Key:', mapsKeyValidation.error);
    console.error('💡 Fix:');
    console.error('   1. Create/update .env.local in project root');
    console.error('   2. Add: VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here');
    console.error('   3. Restart dev server: npm run dev');
  }
  
  // Check Firebase vars (for comparison)
  const firebaseVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
  ];
  
  console.log('\n📊 Firebase Variables Status:');
  firebaseVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (value && typeof value === 'string' && value.trim() !== '') {
      console.log(`   ✅ ${varName}: Configured`);
    } else {
      console.warn(`   ⚠️ ${varName}: Missing or empty`);
    }
  });
  
  // Environment info
  console.log('\n🌍 Environment Info:');
  console.log('   Mode:', import.meta.env.MODE);
  console.log('   Dev:', import.meta.env.DEV);
  console.log('   Prod:', import.meta.env.PROD);
  
  console.groupEnd();
  
  return {
    googleMapsKey: mapsKeyValidation,
    allVars: allVars
  };
};

// Auto-run validation in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Run after a short delay to ensure everything is loaded
  setTimeout(() => {
    validateAllEnvVars();
  }, 500);
  
  // Make it available globally for manual debugging
  window.validateEnvVars = validateAllEnvVars;
  window.validateGoogleMapsKey = validateGoogleMapsAPIKey;
  
  // Also expose centralized config validation
  import('../config/googleMapsConfig').then((config) => {
    window.validateGoogleMapsConfig = config.validateGoogleMapsConfig;
    window.getGoogleMapsConfig = () => ({
      apiKey: config.getGoogleMapsAPIKey(),
      isConfigured: config.isGoogleMapsConfigured(),
      envInfo: config.getEnvInfo(),
      validation: config.validateGoogleMapsConfig()
    });
  }).catch(() => {
    // Config module not available
  });
  
  console.log('💡 Env validation utilities available:');
  console.log('   - window.validateEnvVars() - Validate all env vars');
  console.log('   - window.validateGoogleMapsKey() - Validate Google Maps key (legacy)');
  console.log('   - window.validateGoogleMapsConfig() - Validate Google Maps config (recommended)');
  console.log('   - window.getGoogleMapsConfig() - Get full Google Maps config');
  console.log('   - await window.debugGoogleMapsKey() - Full diagnostics (async)');
}

