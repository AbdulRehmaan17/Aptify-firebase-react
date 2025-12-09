import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * GlobalErrorBoundary
 * Wraps the entire app to catch any unhandled errors
 * This prevents blank screens from crashing the entire app
 */
export default function GlobalErrorBoundary({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}


