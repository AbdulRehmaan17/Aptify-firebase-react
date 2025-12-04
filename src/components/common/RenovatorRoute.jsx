import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * RenovatorRoute - Protects routes that require renovator role
 * Redirects non-renovator users to their dashboard
 */
const RenovatorRoute = ({ children }) => {
  const { currentUser, loading, isRenovator, getUserRole, isAdmin } = useAuth();
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

  // If user is not renovator (and not admin), redirect to appropriate dashboard
  if (!isRenovator() && !isAdmin()) {
    const role = getUserRole();
    switch (role) {
      case 'constructor':
        return <Navigate to="/constructor-dashboard" replace />;
      case 'provider':
        return <Navigate to="/provider-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // User is renovator or admin, allow access
  return children;
};

export default RenovatorRoute;



