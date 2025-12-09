import { toast } from "react-hot-toast";

/**
 * Handle Firestore errors with user-friendly toast messages
 * @param {Error} err - The error object
 * @param {string} context - Context description (e.g., "properties", "notifications")
 */
export function handleFirestoreError(err, context = "") {
  console.error("Firestore error", context, err);
  
  // Extract user-friendly error message
  let errorMessage = err?.message || String(err);
  
  // Handle specific error codes
  if (err?.code === 'permission-denied') {
    errorMessage = 'Permission denied. Please check your authentication.';
  } else if (err?.code === 'failed-precondition') {
    errorMessage = 'Firestore index required. Please create the required index.';
  } else if (err?.code === 'unavailable') {
    errorMessage = 'Service temporarily unavailable. Please try again.';
  }
  
  // Show toast notification
  const contextText = context ? `${context} ` : '';
  toast.error(`Failed to load ${contextText}: ${errorMessage}`);
}

/**
 * Safe snapshot mapping with id and fallback guards
 * @param {QuerySnapshot} snapshot - Firestore query snapshot
 * @returns {Array} Mapped array with id and data
 */
export function mapSnapshotDocs(snapshot) {
  return snapshot.docs.map(doc => {
    const data = doc.data() || {};
    return { id: doc.id, ...data };
  });
}

/**
 * Get display name with fallback guards
 * @param {Object} data - Data object
 * @returns {string} Display name
 */
export function getDisplayName(data) {
  return data?.name || data?.displayName || data?.fullName || "Unknown";
}

