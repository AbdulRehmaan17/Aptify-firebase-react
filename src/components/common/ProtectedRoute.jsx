import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute Component
 * Guards routes that require authentication
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component to render if authenticated
 * @param {boolean} props.adminOnly - If true, only allows admin users
 * @returns {React.ReactNode}
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, loading, getUserRole, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!currentUser) {
    // Preserve the intended destination for redirect after login
    const redirectPath = location.pathname + location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // Admin-only routes check
  if (adminOnly && !isAdmin()) {
    const role = getUserRole();
    // Redirect based on role
    if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
