import React, { useState, useEffect, useRef } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded, isPlacesAPILoaded } from '../../utils/googleMapsLoader';
import { MapPin, Search } from 'lucide-react';
import Input from '../common/Input';

/**
 * PlacesAutocomplete Component
 * 
 * Google Places Autocomplete input for address search
 * Provides address suggestions as user types
 * 
 * Props:
 * - value: string - Current address value
 * - onChange: (address, location) => void - Callback when address is selected
 * - placeholder: string - Input placeholder
 * - className: string - Additional CSS classes
 * - required: boolean - Whether field is required
 * 
 * For FYP: This component uses Google Places API to provide
 * intelligent address suggestions and automatically extracts
 * coordinates when an address is selected
 */
const PlacesAutocomplete = ({
  value = '',
  onChange,
  placeholder = 'Search for an address...',
  className = '',
  required = false,
  error = null,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let isMounted = true;

    const initializePlaces = async () => {
      try {
        const loaded = await loadGoogleMapsAPI();
        
        if (!isMounted) return;

        if (!loaded || !isGoogleMapsLoaded()) {
          if (import.meta.env.DEV) {
            console.warn('Google Maps API not loaded');
          }
          setApiError('Google Maps API is not available. Please check your API key configuration.');
          setApiReady(false);
          return;
        }

        // Safely check for Places API
        if (!isPlacesAPILoaded()) {
          if (import.meta.env.DEV) {
            console.warn('Places API not available');
          }
          setApiError('Places API is not available. Please ensure Places API is enabled in Google Cloud Console.');
          setApiReady(false);
          return;
        }

        // Safely initialize services
        try {
          if (window.google && window.google.maps && window.google.maps.places) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
            placesServiceRef.current = new window.google.maps.places.PlacesService(
              document.createElement('div')
            );
            setApiReady(true);
            setApiError(null);
          } else {
            throw new Error('Google Maps Places API not available');
          }
        } catch (initError) {
          if (import.meta.env.DEV) {
            console.error('Error initializing Places API:', initError);
          }
          setApiError('Failed to initialize Places API');
          setApiReady(false);
        }
      } catch (err) {
        if (isMounted) {
          if (import.meta.env.DEV) {
            console.error('Error loading Google Maps API:', err);
          }
          setApiError('Failed to load Google Maps API');
          setApiReady(false);
        }
      }
    };

    initializePlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change
  const handleInputChange = (e) => {
    const query = e.target.value;
    setInputValue(query);

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Guard: Check if API is ready
    if (!apiReady || !autocompleteServiceRef.current) {
      if (import.meta.env.DEV && !apiReady) {
        console.warn('Places API not ready yet');
      }
      return;
    }

    // Guard: Double check window.google exists
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      if (import.meta.env.DEV) {
        console.warn('Google Maps Places API not available');
      }
      return;
    }

    setLoading(true);

    try {
      // Get place predictions
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'pk' }, // Restrict to Pakistan
          types: ['address', 'establishment'],
        },
        (predictions, status) => {
          setLoading(false);

          // Safely check status
          if (window.google && 
              window.google.maps && 
              window.google.maps.places && 
              status === window.google.maps.places.PlacesServiceStatus.OK && 
              predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error getting place predictions:', err);
      }
      setLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle place selection
  const handlePlaceSelect = (placeId) => {
    // Guard: Check if API is ready
    if (!apiReady || !placesServiceRef.current) {
      if (import.meta.env.DEV) {
        console.warn('Places API not ready');
      }
      return;
    }

    // Guard: Double check window.google exists
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      if (import.meta.env.DEV) {
        console.warn('Google Maps Places API not available');
      }
      return;
    }

    if (!placeId) {
      return;
    }

    setLoading(true);
    setShowSuggestions(false);

    try {
      // Get place details
      placesServiceRef.current.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'geometry', 'address_components'],
        },
        (place, status) => {
          setLoading(false);

          // Safely check status and place data
          if (window.google && 
              window.google.maps && 
              window.google.maps.places && 
              status === window.google.maps.places.PlacesServiceStatus.OK && 
              place && 
              place.geometry && 
              place.geometry.location) {
            try {
              const address = place.formatted_address || '';
              const location = {
                lat: typeof place.geometry.location.lat === 'function' 
                  ? place.geometry.location.lat() 
                  : place.geometry.location.lat,
                lng: typeof place.geometry.location.lng === 'function' 
                  ? place.geometry.location.lng() 
                  : place.geometry.location.lng,
              };

              setInputValue(address);

              // Extract address components
              let city = '';
              let state = '';
              let country = 'Pakistan';
              let postalCode = '';

              if (place.address_components && Array.isArray(place.address_components)) {
                place.address_components.forEach((component) => {
                  if (!component.types || !Array.isArray(component.types)) return;
                  
                  const types = component.types;
                  
                  if (types.includes('locality')) {
                    city = component.long_name || '';
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.long_name || '';
                  } else if (types.includes('country')) {
                    country = component.long_name || 'Pakistan';
                  } else if (types.includes('postal_code')) {
                    postalCode = component.long_name || '';
                  }
                });
              }

              // Call onChange with address, location, and components
              if (onChange) {
                onChange({
                  address: address,
                  location: location,
                  city: city,
                  state: state,
                  country: country,
                  postalCode: postalCode,
                });
              }
            } catch (parseError) {
              if (import.meta.env.DEV) {
                console.error('Error parsing place data:', parseError);
              }
            }
          }
        }
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error getting place details:', err);
      }
      setLoading(false);
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show error state if API failed
  if (apiError && !apiReady) {
    return (
      <div className={`relative ${className}`}>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={() => {}} // Disabled
          placeholder={placeholder}
          required={required}
          error={apiError}
          leftIcon={<Search className="w-4 h-4" />}
          disabled={true}
        />
        <p className="text-xs text-textSecondary mt-1">
          Address search is unavailable. You can still enter an address manually.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={apiReady ? placeholder : 'Loading address search...'}
        required={required}
        error={error}
        leftIcon={<Search className="w-4 h-4" />}
        disabled={loading || !apiReady}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-surface border border-muted rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handlePlaceSelect(prediction.place_id)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3 border-b border-muted last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-textMain truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-textSecondary truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlacesAutocomplete;

