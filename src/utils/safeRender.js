/**
 * Safe rendering utilities to prevent rendering objects directly in JSX
 */

/**
 * Safely renders an address object as a formatted string
 * @param {Object|string|null|undefined} address - Address object or string
 * @returns {string} - Formatted address string
 */
export const formatAddress = (address) => {
  if (!address) return 'Location not specified';

  // If it's already a string, return it
  if (typeof address === 'string') return address;

  // If it's an object, format it
  if (typeof address === 'object') {
    const parts = [];

    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country && address.country !== 'Pakistan') parts.push(address.country);

    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  }

  return 'Location not specified';
};

/**
 * Safely renders any value as a string
 * Handles objects, arrays, null, undefined, etc.
 * @param {any} value - Value to render
 * @param {string} fallback - Fallback string if value cannot be rendered
 * @returns {string} - Safe string representation
 */
export const safeRender = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;

  // If it's already a string or number, return it as string
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  // If it's a boolean, return it as string
  if (typeof value === 'boolean') {
    return String(value);
  }

  // If it's an array, join it
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : fallback;
  }

  // If it's an object, try to stringify it (for debugging)
  if (typeof value === 'object') {
    try {
      // If it has common display properties, use them
      if (
        value.toString &&
        typeof value.toString === 'function' &&
        value.toString() !== '[object Object]'
      ) {
        return value.toString();
      }

      // For address objects, use formatAddress
      if (value.line1 || value.city || value.state) {
        return formatAddress(value);
      }

      // Otherwise, return fallback to avoid rendering [object Object]
      return fallback || 'N/A';
    } catch (e) {
      return fallback || 'N/A';
    }
  }

  return fallback || 'N/A';
};

/**
 * Safely renders a price value
 * @param {number|string|null|undefined} price - Price value
 * @param {string} currency - Currency code (default: 'PKR')
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currency = 'PKR') => {
  if (price === null || price === undefined || price === '') {
    return 'Price not available';
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return 'Price not available';
  }

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(numPrice);
};
