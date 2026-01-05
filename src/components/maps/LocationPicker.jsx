import React, { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import PlacesAutocomplete from './PlacesAutocomplete';
import MapErrorBoundary from './MapErrorBoundary';
import { validateGoogleMapsConfig } from '../../config/googleMapsConfig';
import { MapPin } from 'lucide-react';

/**
 * LocationPicker Component
 * 
 * Combined component for location selection with:
 * - Google Places Autocomplete for address search
 * - Interactive map with draggable marker
 * - Real-time coordinate updates
 * 
 * Props:
 * - location: { lat: number, lng: number, address: string } - Initial location
 * - onLocationChange: (location) => void - Callback when location changes
 * - required: boolean - Whether location is required
 * - error: string - Error message to display
 * 
 * For FYP: This component provides a complete location selection
 * interface combining address search and map interaction
 */
const LocationPicker = ({
  location = null,
  onLocationChange,
  required = false,
  error = null,
}) => {
  const [currentLocation, setCurrentLocation] = useState(
    location || { lat: 24.8607, lng: 67.0011, address: '' } // Default: Karachi
  );
  const [address, setAddress] = useState(location?.address || '');
  const [envValid, setEnvValid] = useState(true);
  const [envMessage, setEnvMessage] = useState(null);

  // Validate API key on mount and when component updates
  useEffect(() => {
    // Re-validate API key (in case it was added after initial load)
    const validation = validateGoogleMapsConfig();
    setEnvValid(validation.valid);
    setEnvMessage(validation.error);
    
    // Only log warning in dev mode if key is truly missing
    if (!validation.valid && import.meta.env.DEV) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // Check if it's undefined (most common issue)
      if (apiKey === undefined) {
        console.error('❌ Google Maps API Key is undefined');
        console.error('   This means Vite is not loading the variable.');
        console.error('   Run: window.validateGoogleMapsKey() for detailed diagnostics');
      } else if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || (typeof apiKey === 'string' && apiKey.trim() === '')) {
        console.warn('⚠️ Google Maps API Key Validation:', validation.error);
        console.log('💡 To debug, run: window.validateGoogleMapsKey() or window.debugGoogleMapsKey()');
      }
    }
  }, []);

  // Update when location prop changes
  useEffect(() => {
    if (location) {
      setCurrentLocation(location);
      setAddress(location.address || '');
    }
  }, [location]);

  // Handle address selection from autocomplete
  const handleAddressSelect = (data) => {
    const newLocation = {
      lat: data.location.lat,
      lng: data.location.lng,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
    };

    setCurrentLocation(newLocation);
    setAddress(data.address);

    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };

  // Handle location change from map
  const handleMapLocationChange = (data) => {
    const newLocation = {
      ...currentLocation,
      lat: data.lat,
      lng: data.lng,
      address: data.address || currentLocation.address,
    };

    setCurrentLocation(newLocation);
    if (data.address) {
      setAddress(data.address);
    }

    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };

  // Handle manual address input when API key is missing
  const handleManualAddressChange = (e) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // Update location data with manual address
    if (onLocationChange) {
      onLocationChange({
        ...currentLocation,
        address: newAddress,
      });
    }
  };

  // Show warning if API key is not configured
  if (!envValid) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            ⚠️ Google Maps API key is not configured. Map features are disabled.
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {envMessage || 'Please set VITE_GOOGLE_MAPS_API_KEY in your .env file and restart the dev server to enable map features.'}
          </p>
          {import.meta.env.DEV && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 space-y-1">
              <p className="font-mono bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                Note: After adding the API key to .env.local, restart the dev server (stop and run npm run dev again)
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                💡 Debug: Open browser console (F12) and run: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">window.debugGoogleMapsKey()</code>
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Property Address <span className="text-error">{required ? '*' : ''}</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={handleManualAddressChange}
            placeholder="Enter property address manually..."
            className={`w-full px-3 py-2 border rounded-base focus:border-primary focus:ring-primary ${
              error ? 'border-error' : 'border-muted'
            }`}
            required={required}
          />
          {error && (
            <p className="text-error text-sm mt-1">{error}</p>
          )}
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-textSecondary text-xs">
            Note: Without Google Maps API, you'll need to enter coordinates manually or skip location selection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address Search */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Property Address <span className="text-error">{required ? '*' : ''}</span>
        </label>
        <MapErrorBoundary height="auto">
          <PlacesAutocomplete
            value={address}
            onChange={handleAddressSelect}
            placeholder="Search for property address..."
            required={required}
            error={error}
          />
        </MapErrorBoundary>
        {error && (
          <p className="text-error text-sm mt-1">{error}</p>
        )}
      </div>

      {/* Map Display */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          Select Location on Map
        </label>
        <MapErrorBoundary height="400px">
          <GoogleMap
            center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
            onLocationChange={handleMapLocationChange}
            height="400px"
            draggable={true}
            clickable={true}
          />
        </MapErrorBoundary>
        <p className="text-xs text-textSecondary mt-2">
          💡 Tip: Search for an address above or click/drag the marker on the map to set the location
        </p>
      </div>

      {/* Location Info */}
      {currentLocation && 
       typeof currentLocation.lat === 'number' && 
       typeof currentLocation.lng === 'number' && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-textSecondary">Latitude:</span>
              <span className="ml-2 font-mono text-textMain">{currentLocation.lat.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-textSecondary">Longitude:</span>
              <span className="ml-2 font-mono text-textMain">{currentLocation.lng.toFixed(6)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;

