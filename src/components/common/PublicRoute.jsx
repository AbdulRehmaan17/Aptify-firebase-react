import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * PublicRoute - Redirects authenticated users to their dashboard
 * Allows only unauthenticated users to access the route
 */
const PublicRoute = ({ children }) => {
  const { currentUser, loading, getUserRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is authenticated, redirect to appropriate dashboard
  if (currentUser) {
    const role = getUserRole();
    const from = location.state?.from?.pathname || '/';

    // Redirect based on role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is not authenticated, allow access
  return children;
};

export default PublicRoute;

