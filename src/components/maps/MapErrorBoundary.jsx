import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * MapErrorBoundary Component
 * 
 * Error boundary specifically for Google Maps components
 * Prevents map errors from crashing the entire form
 */
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('MapErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg p-6" style={{ minHeight: this.props.height || '400px' }}>
          <div className="text-center">
            <MapPin className="w-12 h-12 text-textSecondary mx-auto mb-2" />
            <p className="text-textSecondary text-sm mb-2">
              Map is temporarily unavailable
            </p>
            <p className="text-textSecondary text-xs">
              You can still enter the address manually below
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-textSecondary">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;

