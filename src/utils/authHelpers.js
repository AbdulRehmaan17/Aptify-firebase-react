/**
 * Authentication helper utilities
 * Provides reusable functions for authentication redirects and guards
 */

/**
 * Require authentication before proceeding to a path
 * If user is not logged in, redirects to /auth with next param
 * @param {Function} navigate - React Router navigate function
 * @param {string} nextPath - Path to redirect to after login
 * @param {Object} user - Current user object from AuthContext
 * @returns {boolean} - true if user is authenticated, false if redirected
 */
export const requireAuth = (navigate, nextPath, user) => {
  if (!user) {
    const encodedPath = encodeURIComponent(nextPath);
    navigate(`/auth?next=${encodedPath}`);
    return false;
  }
  return true;
};

/**
 * Redirect to the next path after successful login
 * Reads the 'next' query parameter from location.search
 * @param {Function} navigate - React Router navigate function
 * @param {string} search - location.search string
 * @param {string} defaultPath - Default path if no 'next' param exists
 */
export const redirectToNext = (navigate, search, defaultPath = '/dashboard') => {
  try {
    const params = new URLSearchParams(search);
    const nextPath = params.get('next');
    if (nextPath) {
      navigate(decodeURIComponent(nextPath));
    } else {
      navigate(defaultPath);
    }
  } catch (error) {
    console.error('Error parsing next parameter:', error);
    navigate(defaultPath);
  }
};

