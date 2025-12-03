import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProviderRoute - Protects routes that require provider role
 * Redirects non-provider users to their dashboard
 */
const ProviderRoute = ({ children }) => {
  const { currentUser, loading, isProvider, getUserRole, isAdmin } = useAuth();
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

  // If user is not provider (and not admin), redirect to appropriate dashboard
  if (!isProvider() && !isAdmin()) {
    const role = getUserRole();
    switch (role) {
      case 'constructor':
        return <Navigate to="/constructor-dashboard" replace />;
      case 'renovator':
        return <Navigate to="/renovator-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // User is provider or admin, allow access
  return children;
};

export default ProviderRoute;

