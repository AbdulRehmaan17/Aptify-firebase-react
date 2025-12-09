/**
 * Centralized Firestore Error Handler
 * Provides consistent error logging and handling across all Firestore operations
 */

export const handleFirestoreError = (error, context = '') => {
  const errorContext = context ? `[${context}]` : '';
  
  console.error(`❌ ERROR${errorContext}: Firestore operation failed`);
  console.error('   Error Code:', error.code || 'N/A');
  console.error('   Error Message:', error.message);
  console.error('   Full Error:', error);
  
  // Provide specific guidance based on error code
  if (error.code === 'permission-denied') {
    console.error('🔒 PERMISSION DENIED');
    console.error('   → Check Firestore security rules');
    console.error('   → Ensure user is authenticated if required');
    console.error('   → Verify rules allow the requested operation');
    return {
      type: 'permission-denied',
      message: 'Permission denied. Please check Firestore security rules.',
      userMessage: 'You do not have permission to access this data. Please contact support if this persists.',
    };
  }
  
  if (error.code === 'failed-precondition') {
    console.error('📊 INDEX REQUIRED');
    console.error('   → Create the required Firestore index');
    console.error('   → Check browser console for index creation link');
    console.error('   → Or update firestore.indexes.json and deploy');
    return {
      type: 'index-required',
      message: 'Firestore index required. Please create the required index.',
      userMessage: 'A database index is required. This will be created automatically. Please try again in a moment.',
    };
  }
  
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    console.error('🌐 NETWORK ERROR');
    console.error('   → Check internet connection');
    console.error('   → Firebase service may be temporarily unavailable');
    return {
      type: 'network-error',
      message: 'Network error. Please check your connection.',
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    };
  }
  
  if (error.message?.includes('not initialized') || !error.code) {
    console.error('⚙️ CONFIGURATION ERROR');
    console.error('   → Check Firebase configuration');
    console.error('   → Verify environment variables are set');
    console.error('   → Ensure Firebase app is initialized');
    return {
      type: 'config-error',
      message: 'Firebase is not properly configured.',
      userMessage: 'Application configuration error. Please contact support.',
    };
  }
  
  // Generic error
  return {
    type: 'unknown',
    message: error.message || 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
  };
};

/**
 * Check if Firestore is initialized before operations
 */
export const checkFirestoreInitialized = (db, context = '') => {
  if (!db) {
    const error = new Error('Firestore database is not initialized');
    console.error(`❌ CRITICAL${context ? ` [${context}]` : ''}: Firestore db is null!`);
    console.error('   → Check Firebase configuration');
    console.error('   → Verify environment variables');
    console.error('   → Ensure Firebase app is initialized');
    throw error;
  }
  return true;
};

/**
 * Wrap Firestore operations with error handling
 */
export const withErrorHandling = async (operation, context = '') => {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = handleFirestoreError(error, context);
    throw new Error(errorInfo.message);
  }
};


