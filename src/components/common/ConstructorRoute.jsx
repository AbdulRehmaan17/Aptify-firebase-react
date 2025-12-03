import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ConstructorRoute - Protects routes that require constructor role
 * Redirects non-constructor users to their dashboard
 */
const ConstructorRoute = ({ children }) => {
  const { currentUser, loading, isConstructor, getUserRole, isAdmin } = useAuth();
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

  // If user is not constructor (and not admin), redirect to appropriate dashboard
  if (!isConstructor() && !isAdmin()) {
    const role = getUserRole();
    switch (role) {
      case 'renovator':
        return <Navigate to="/renovator-dashboard" replace />;
      case 'provider':
        return <Navigate to="/provider-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // User is constructor or admin, allow access
  return children;
};

export default ConstructorRoute;


