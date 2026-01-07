import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute Component
 * Guards routes that require authentication
 * Prevents rendering until auth is resolved to avoid redirect loops
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component to render if authenticated
 * @param {string} props.requiredRole - Optional role requirement (e.g., 'admin', 'constructor', 'renovator')
 * @param {boolean} props.adminOnly - If true, only allows admin users (backward compatibility)
 * @param {boolean} props.constructorOnly - If true, only allows constructor users (backward compatibility)
 * @param {boolean} props.renovatorOnly - If true, only allows renovator users (backward compatibility)
 * @returns {React.ReactNode}
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole,
  adminOnly = false, 
  constructorOnly = false, 
  renovatorOnly = false 
}) {
  const { currentUser, userProfile, authLoading } = useAuth();

  if (authLoading) {
    // minimal loading placeholder so that router doesn't mis-route during initial auth
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

  return children;
}
