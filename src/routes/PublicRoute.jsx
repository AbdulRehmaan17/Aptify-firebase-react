import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * PublicRoute (React Router v6)
 * Wraps an <Outlet /> and redirects authenticated users away from public pages.
 *
 * NOTE: This preserves the existing auth behavior; only the routing pattern changed.
 */
const PublicRoute = () => {
  const { currentUser, authLoading, getUserRole } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is authenticated (and auth has settled), redirect to appropriate dashboard
  if (currentUser) {
    const role = getUserRole();
    const from = location.state?.from?.pathname || '/';

    // Redirect based on role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      // Preserve previous behavior; provider dashboard route is still handled elsewhere
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is not authenticated, allow access to nested public routes
  return <Outlet />;
};

export default PublicRoute;







