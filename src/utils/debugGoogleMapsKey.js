/**
 * Debug utility for Google Maps API Key
 * 
 * Run this in browser console to check API key status:
 * window.debugGoogleMapsKey()
 * 
 * This utility provides comprehensive diagnostics for Google Maps API key issues
 */

export const debugGoogleMapsKey = async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Also use centralized config validation
  let configValidation = null;
  let envInfo = null;
  try {
    const configModule = await import('../config/googleMapsConfig');
    configValidation = configModule.validateGoogleMapsConfig();
    envInfo = configModule.getEnvInfo();
    console.log('📊 Config Validation:', configValidation);
    console.log('🌍 Environment Info:', envInfo);
  } catch (e) {
    // Config module not available, continue with basic check
    console.warn('Could not load config module:', e);
  }
  
  console.group('🔍 Google Maps API Key Debug');
  
  // Critical check: Is it undefined?
  if (apiKey === undefined) {
    console.error('❌ CRITICAL: VITE_GOOGLE_MAPS_API_KEY is undefined');
    console.error('');
    console.error('This means Vite is NOT loading the variable. Possible causes:');
    console.error('');
    console.error('1. Variable not in .env.local file');
    console.error('   → Check: Does .env.local exist in project root?');
    console.error('   → Check: Does it contain VITE_GOOGLE_MAPS_API_KEY=...?');
    console.error('');
    console.error('2. Dev server not restarted');
    console.error('   → Fix: Stop server (Ctrl+C) and run: npm run dev');
    console.error('');
    console.error('3. Variable name misspelled');
    console.error('   → Must be exactly: VITE_GOOGLE_MAPS_API_KEY');
    console.error('   → Check for typos, extra spaces, wrong case');
    console.error('');
    console.error('4. Wrong file name');
    console.error('   → Use .env.local (not .env)');
    console.error('   → File must be in project root (same folder as package.json)');
    console.error('');
  } else {
    console.log('✅ Variable exists:', apiKey !== undefined);
    console.log('Raw value:', apiKey);
    console.log('Type:', typeof apiKey);
    console.log('Is null:', apiKey === null);
    console.log('Is empty string:', apiKey === '');
    console.log('Is placeholder:', apiKey === 'YOUR_GOOGLE_MAPS_API_KEY');
    
    if (apiKey && typeof apiKey === 'string') {
      const trimmed = apiKey.trim();
      console.log('Trimmed length:', trimmed.length);
      console.log('Trimmed value (first 10 chars):', trimmed.substring(0, 10) + '...');
      console.log('Is valid format:', trimmed.length >= 10 && trimmed !== 'YOUR_GOOGLE_MAPS_API_KEY');
      
      if (trimmed.length < 10) {
        console.warn('⚠️ Key is too short. Google Maps API keys are typically 39+ characters.');
      }
      if (trimmed === 'YOUR_GOOGLE_MAPS_API_KEY') {
        console.error('❌ Key is still a placeholder. Replace with your actual API key.');
      }
    }
  }
  
  // Check all env vars that start with VITE_
  const viteEnvVars = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .reduce((acc, key) => {
      // Don't log full values for security, just indicate if they exist
      acc[key] = import.meta.env[key] ? 
        (typeof import.meta.env[key] === 'string' && import.meta.env[key].length > 0 ? 
          `[${import.meta.env[key].length} chars]` : 
          import.meta.env[key]) : 
        'undefined';
      return acc;
    }, {});
  
  console.log('');
  console.log('📋 All VITE_ environment variables:');
  console.table(viteEnvVars);
  
  console.log('');
  console.log('🌍 Environment Info:');
  console.log('   Mode:', import.meta.env.MODE);
  console.log('   Dev mode:', import.meta.env.DEV);
  console.log('   Prod mode:', import.meta.env.PROD);
  
  // Compare with Firebase vars (which work)
  console.log('');
  console.log('🔍 Comparison with Firebase vars (which work):');
  const firebaseKey = import.meta.env.VITE_FIREBASE_API_KEY;
  console.log('   VITE_FIREBASE_API_KEY:', firebaseKey ? `[${firebaseKey.length} chars]` : 'undefined');
  console.log('   VITE_GOOGLE_MAPS_API_KEY:', apiKey ? `[${apiKey.length} chars]` : 'undefined');
  
  if (firebaseKey && !apiKey) {
    console.error('');
    console.error('⚠️ Firebase key works but Google Maps key doesn\'t!');
    console.error('   This suggests the Google Maps key is missing from .env.local');
    console.error('   Check your .env.local file and ensure VITE_GOOGLE_MAPS_API_KEY is present.');
  }
  
  console.groupEnd();
  
  // Final summary
  if (configValidation) {
    console.log('');
    console.log('📋 Summary:');
    console.log('   Config Validation:', configValidation.valid ? '✅ Valid' : '❌ Invalid');
    if (!configValidation.valid) {
      console.log('   Error:', configValidation.error);
    }
  }
  
  return {
    apiKey,
    isUndefined: apiKey === undefined,
    isValid: apiKey && 
             typeof apiKey === 'string' && 
             apiKey.trim() !== '' && 
             apiKey.trim() !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
             apiKey.trim().length >= 10,
    allViteVars: viteEnvVars,
    configValidation: configValidation,
    envInfo: envInfo
  };
};

// Make it available globally in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.debugGoogleMapsKey = debugGoogleMapsKey;
  console.log('💡 Debug utility available. Run: window.debugGoogleMapsKey()');
  console.log('   Note: This is now async, use: await window.debugGoogleMapsKey()');
}

