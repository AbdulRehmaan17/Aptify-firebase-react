import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute (React Router v6)
 * Wraps an <Outlet /> and guards all nested routes.
 *
 * NOTE: This is a routing-only wrapper; it does not change business logic.
 * It mirrors the previous behavior that wrapped children directly.
 */
export default function ProtectedRoute({
  requiredRole,
  adminOnly = false,
  constructorOnly = false,
  renovatorOnly = false,
}) {
  const { currentUser, userProfile, authLoading } = useAuth();

  if (authLoading) {
    // Minimal loading placeholder so routes don't mis-route during initial auth
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/auth?next=${redirectTo}`} replace />;
  }

  // Handle role requirements (new pattern)
  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Backward compatibility: admin-only routes
  if (adminOnly && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Backward compatibility: constructor-only routes
  if (constructorOnly && userProfile?.role !== 'constructor') {
    const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/auth?next=${redirectTo}`} replace />;
  }

  // Backward compatibility: renovator-only routes
  if (renovatorOnly && userProfile?.role !== 'renovator') {
    const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/auth?next=${redirectTo}`} replace />;
  }

  // If we reach here, user is allowed: render nested routes
  return <Outlet />;
}










