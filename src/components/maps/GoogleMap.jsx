import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '../../utils/googleMapsLoader';
import { isGoogleMapsConfigured } from '../../config/googleMapsConfig';
import GoogleMapPlaceholder from './GoogleMapPlaceholder';
import { MapPin } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * GoogleMap Component
 * 
 * Reusable Google Maps component with draggable marker
 * Supports location selection and reverse geocoding
 * 
 * Props:
 * - center: { lat: number, lng: number } - Initial map center
 * - zoom: number - Map zoom level (default: 15)
 * - onLocationChange: (location) => void - Callback when location changes
 * - height: string - Map height (default: '400px')
 * - draggable: boolean - Allow marker dragging (default: true)
 * - clickable: boolean - Allow map clicks to set location (default: true)
 * 
 * For FYP: This component provides interactive map functionality
 * for property location selection with real-time coordinate updates
 */
const GoogleMap = ({
  center = { lat: 24.8607, lng: 67.0011 }, // Default: Karachi, Pakistan
  zoom = 15,
  onLocationChange,
  height = '400px',
  draggable = true,
  clickable = true,
  className = '',
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(center);

  // Check if API key is configured - show placeholder if not
  const isConfigured = isGoogleMapsConfigured();
  
  if (!isConfigured) {
    return (
      <GoogleMapPlaceholder
        center={center}
        zoom={zoom}
        height={height}
        className={className}
      />
    );
  }

  // Initialize map
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        // Load Google Maps API
        const loaded = await loadGoogleMapsAPI();
        
        if (!loaded) {
          if (isMounted) {
            setError('Failed to load Google Maps API. Please check your API key configuration.');
            setLoading(false);
          }
          return;
        }

        if (!isGoogleMapsLoaded()) {
          if (isMounted) {
            setError('Google Maps API is not available.');
            setLoading(false);
          }
          return;
        }

        if (!mapRef.current) {
          if (isMounted) {
            setError('Map container is not available.');
            setLoading(false);
          }
          return;
        }

        // Safely initialize map
        if (!window.google || !window.google.maps || !window.google.maps.Map) {
          throw new Error('Google Maps API not available');
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center: currentLocation,
          zoom: zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        // Initialize geocoder for reverse geocoding
        if (window.google.maps.Geocoder) {
          geocoderRef.current = new window.google.maps.Geocoder();
        }

        // Create marker
        const marker = new window.google.maps.Marker({
          position: currentLocation,
          map: map,
          draggable: draggable,
          animation: window.google.maps.Animation ? window.google.maps.Animation.DROP : undefined,
          title: 'Property Location',
        });

        markerRef.current = marker;

        // Handle marker drag end
        if (draggable) {
          marker.addListener('dragend', () => {
            const newPosition = marker.getPosition();
            const newLocation = {
              lat: newPosition.lat(),
              lng: newPosition.lng(),
            };
            handleLocationChange(newLocation);
          });
        }

        // Handle map click
        if (clickable) {
          map.addListener('click', (e) => {
            const newLocation = {
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            };
            marker.setPosition(newLocation);
            handleLocationChange(newLocation);
          });
        }

        if (isMounted) {
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Error initializing Google Map:', err);
        if (isMounted) {
          setError('Failed to initialize map. Please try again.');
          setLoading(false);
        }
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      isMounted = false;
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []); // Run only once on mount

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center && isGoogleMapsLoaded()) {
      try {
        if (window.google && window.google.maps && window.google.maps.LatLng) {
          const newCenter = new window.google.maps.LatLng(center.lat, center.lng);
          mapInstanceRef.current.setCenter(newCenter);
          
          if (markerRef.current) {
            markerRef.current.setPosition(newCenter);
          }
          
          setCurrentLocation(center);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Error updating map center:', err);
        }
      }
    }
  }, [center]);

  // Handle location change with reverse geocoding
  const handleLocationChange = useCallback(async (location) => {
    setCurrentLocation(location);

    // Reverse geocoding to get address
    let address = '';
    if (geocoderRef.current) {
      try {
        const results = await new Promise((resolve, reject) => {
          geocoderRef.current.geocode(
            { location: location },
            (results, status) => {
              if (status === 'OK' && results[0]) {
                resolve(results[0]);
              } else {
                reject(new Error('Geocoding failed'));
              }
            }
          );
        });

        address = results.formatted_address;
      } catch (err) {
        console.warn('Reverse geocoding failed:', err);
        address = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      }
    }

    // Call parent callback with location and address
    if (onLocationChange) {
      onLocationChange({
        lat: location.lat,
        lng: location.lng,
        address: address,
      });
    }
  }, [onLocationChange]);

  if (error) {
    return (
      <GoogleMapPlaceholder
        center={currentLocation || center}
        zoom={zoom}
        height={height}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} style={{ height }}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="w-full rounded-lg border border-muted overflow-hidden"
        style={{ height }}
      />
      {currentLocation && 
       typeof currentLocation.lat === 'number' && 
       typeof currentLocation.lng === 'number' && (
        <div className="absolute top-2 left-2 bg-surface px-3 py-1.5 rounded-lg shadow-md border border-muted text-xs">
          <div className="flex items-center gap-1 text-textSecondary">
            <MapPin className="w-3 h-3" />
            <span>
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;

