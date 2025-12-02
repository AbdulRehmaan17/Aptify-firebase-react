import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * AdminRoute - Protects routes that require admin role
 * Redirects non-admin users to their dashboard
 */
const AdminRoute = ({ children }) => {
  const { currentUser, loading, isAdmin, getUserRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is not admin, redirect to appropriate dashboard
  if (!isAdmin()) {
    const role = getUserRole();
    
    if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is admin, allow access
  return children;
};

export default AdminRoute;

