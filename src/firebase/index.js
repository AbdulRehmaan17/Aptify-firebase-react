// Main Firebase exports - re-export from firebase.js for convenience
export { auth, db, storage, googleProvider, isFirebaseInitialized, getFirebaseInitError } from './firebase';

// Auth functions
export {
  login,
  signup,
  loginWithGoogle,
  handleGoogleRedirect,
  logout,
  createOrUpdateUserProfile,
  resetPassword,
  getCurrentUser,
} from './authFunctions';

// Firestore functions
export {
  addDocAutoId,
  getDocById,
  updateDocById,
  deleteDocById,
  fetchCollection,
  docExists,
  batchUpdate,
} from './firestoreFunctions';

// Storage functions
export {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getImageUrl,
} from './storageFunctions';



