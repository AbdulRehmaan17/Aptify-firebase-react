/**
 * Format Helpers
 * 
 * Utilities to safely format data for React rendering
 * Prevents "Objects are not valid as a React child" errors
 */

/**
 * Format address object as a string for safe rendering in JSX
 * Prevents "Objects are not valid as a React child" error
 * 
 * @param {Object|string|null|undefined} address - Address object or string
 * @returns {string} - Formatted address string
 */
export const formatAddress = (address) => {
  // Handle null, undefined, or empty values
  if (!address) return '';
  
  // If already a string, return as-is (trimmed)
  if (typeof address === 'string') {
    return address.trim();
  }
  
  // If it's an object, format it
  if (typeof address === 'object' && !Array.isArray(address)) {
    const parts = [
      address?.line1,
      address?.line2,
      address?.city,
      address?.state,
      address?.postalCode,
      address?.country,
    ].filter(Boolean); // Remove empty/null/undefined values
    
    return parts.join(', ');
  }
  
  // Fallback for unexpected types
  return String(address || '');
};

/**
 * Safely convert any value to a string for React rendering
 * Never returns an object or undefined
 * 
 * @param {*} value - Value to convert
 * @param {string} fallback - Fallback string if value is invalid
 * @returns {string} - Safe string for rendering
 */
export const safeText = (value, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // For arrays, join with comma or return fallback
    return value.length > 0 ? value.map(String).join(', ') : fallback;
  }
  if (typeof value === 'object') {
    // For objects, try to stringify or return fallback
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value || fallback);
};

/**
 * Format Firestore Timestamp for display
 * 
 * @param {*} timestamp - Firestore Timestamp or Date
 * @param {Object} options - Format options
 * @returns {string} - Formatted date string
 */
export const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return '';
  
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?.toMillis) {
    date = new Date(timestamp.toMillis());
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return '';
  }
  
  const {
    format = 'short', // 'short', 'long', 'date', 'time'
  } = options;
  
  if (format === 'short') {
    return date.toLocaleDateString();
  } else if (format === 'long') {
    return date.toLocaleString();
  } else if (format === 'date') {
    return date.toLocaleDateString();
  } else if (format === 'time') {
    return date.toLocaleTimeString();
  }
  
  return date.toLocaleString();
};

/**
 * Format price/currency
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'PKR')
 * @returns {string} - Formatted price string
 */
export const formatPrice = (amount, currency = 'PKR') => {
  if (amount == null || isNaN(amount)) return '';
  
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Safely get nested property from object
 * 
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path (e.g., "address.city")
 * @param {*} fallback - Fallback value if path doesn't exist
 * @returns {*} - Value at path or fallback
 */
export const getNested = (obj, path, fallback = null) => {
  if (!obj || !path) return fallback;
  
  const parts = path.split('.');
  let value = obj;
  
  for (const part of parts) {
    if (value == null) return fallback;
    value = value[part];
  }
  
  return value != null ? value : fallback;
};



