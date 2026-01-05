import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { isGoogleMapsConfigured } from '../../config/googleMapsConfig';

/**
 * GoogleMapPlaceholder Component
 * 
 * Visual placeholder for Google Maps that shows when:
 * - API key is not configured
 * - Maps API fails to load
 * - Maps are disabled
 * 
 * This component maintains the same visual space and props interface
 * as GoogleMap, allowing seamless replacement when API key is configured.
 * 
 * Props (matches GoogleMap interface for easy replacement):
 * - center: { lat: number, lng: number } - Location coordinates
 * - zoom: number - Zoom level (not used in placeholder)
 * - height: string - Map height (default: '400px')
 * - className: string - Additional CSS classes
 * - address: string - Optional address to display
 * 
 * For FYP: This ensures all map locations are visually present
 * even when Google Maps API is not configured, maintaining UI consistency
 */
const GoogleMapPlaceholder = ({
  center = { lat: 24.8607, lng: 67.0011 }, // Default: Karachi, Pakistan
  zoom = 15,
  height = '400px',
  className = '',
  address = null,
}) => {
  const isConfigured = isGoogleMapsConfigured();

  return (
    <div 
      className={`relative bg-muted rounded-lg border-2 border-dashed border-muted overflow-hidden ${className}`}
      style={{ width: '100%', height }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div
              key={i}
              className="border border-muted"
              style={{
                backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        {/* Icon */}
        <div className="mb-4">
          <div className="relative">
            <MapPin className="w-16 h-16 text-textSecondary" />
            {!isConfigured && (
              <AlertCircle className="w-6 h-6 text-warning absolute -top-1 -right-1" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-semibold text-textMain">
            {isConfigured ? 'Map Loading...' : 'Map Will Appear Here'}
          </h3>
          
          {!isConfigured ? (
            <>
              <p className="text-sm text-textSecondary">
                Google Maps API key is not configured. Map features are disabled.
              </p>
              <p className="text-xs text-textSecondary mt-2">
                To enable maps, set <code className="bg-muted px-1.5 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code> file and restart the dev server.
              </p>
            </>
          ) : (
            <p className="text-sm text-textSecondary">
              Map is loading. If this message persists, check your API key configuration.
            </p>
          )}

          {/* Location info */}
          {(center?.lat && center?.lng) && (
            <div className="mt-4 pt-4 border-t border-muted">
              <p className="text-xs text-textSecondary mb-1">Location Coordinates:</p>
              <p className="text-sm font-mono text-textMain">
                {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Address if provided */}
          {address && (
            <div className="mt-2">
              <p className="text-xs text-textSecondary mb-1">Address:</p>
              <p className="text-sm text-textMain">
                <MapPin className="w-3 h-3 inline mr-1" />
                {address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Corner badge */}
      <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-textSecondary border border-muted">
        Map Placeholder
      </div>
    </div>
  );
};

export default GoogleMapPlaceholder;

