import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to get redirect function based on user role
 * @returns {Function} redirect function that navigates to appropriate dashboard
 */
export const useRoleRedirect = () => {
  const navigate = useNavigate();
  const { getUserRole } = useAuth();

  const redirectToDashboard = () => {
    const role = getUserRole();
    
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return redirectToDashboard;
};

/**
 * Get redirect path based on user role
 * @param {string} role - User role
 * @returns {string} Redirect path
 */
export const getRedirectPath = (role) => {
  if (role === 'admin') {
    return '/admin';
  } else if (role === 'constructor' || role === 'renovator' || role === 'provider') {
    return '/provider-dashboard';
  } else {
    return '/dashboard';
  }
};

