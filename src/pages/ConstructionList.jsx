import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Phone, Mail, Building2, Eye, MapPin } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * ConstructionList Component
 *
 * Displays a list of construction service providers from Firestore.
 * Fetches providers from "constructionProviders" collection where:
 *   - approved === true
 *   - isActive === true
 * 
 * This is a PUBLIC page and does NOT require authentication.
 * Uses real-time Firestore listener for live updates.
 * Each provider card shows name, company, location, experience, and contact information.
 */
const ConstructionList = () => {
  const navigate = useNavigate();

  // State management - initialize as empty array
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch construction providers from Firestore
   * Queries "constructionProviders" collection with filters:
   *   - approved === true
   *   - isActive === true
   * Uses real-time listener (onSnapshot) for live updates
   */
  useEffect(() => {
    if (!db) {
      if (import.meta.env.DEV) {
        console.warn('Firestore db is not initialized');
      }
      setProviders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (import.meta.env.DEV) {
      console.log('🔍 DEBUG: Setting up query for constructionProviders collection');
      console.log('🔍 DEBUG: Filters: approved === true AND isActive === true');
    }

    // SIMPLE QUERY: Fetch all construction providers, then filter/sort client-side
    // This eliminates Firestore index requirements
    const providersQuery = query(
      collection(db, 'constructionProviders')
    );

    if (import.meta.env.DEV) {
      console.log('✅ DEBUG: Setting up real-time listener for constructionProviders');
    }

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      providersQuery,
      (snapshot) => {
        if (import.meta.env.DEV) {
          console.log('✅ SUCCESS: constructionProviders query - Snapshot size:', snapshot.size);
          console.log('✅ SUCCESS: Raw snapshot docs count:', snapshot.docs.length);
        }

        let providersList = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Normalize location to string if it's an object
          if (data.location && typeof data.location === 'object') {
            data.location = data.location.city
              ? `${data.location.city}${data.location.state ? ', ' + data.location.state : ''}`
              : (data.location.city || data.location.state || JSON.stringify(data.location));
          }

          return {
            id: doc.id,
            ...data,
          };
        });

        // APPLY FILTERS CLIENT-SIDE
        providersList = providersList.filter((p) => {
          return p.approved === true && p.isActive === true;
        });

        // APPLY SORTING CLIENT-SIDE (newest first)
        providersList.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return bTime - aTime; // Descending (newest first)
        });

        if (import.meta.env.DEV) {
          console.log('✅ SUCCESS: Construction providers fetched:', providersList.length, 'providers');
        }

        setProviders(providersList);
        setLoading(false);
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error('❌ ERROR: Error fetching constructionProviders:', error);
        }
        setError('Failed to load construction providers');
        setProviders([]);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  /**
   * Handle "Request Service" button click
   * Navigates to construction request form with providerId as query parameter
   * @param {string} providerId - The ID of the selected provider
   */
  const handleRequestService = (providerId) => {
    navigate(`/construction-request?providerId=${providerId}`);
  };

  /**
   * Format services array as comma-separated string
   * Handles servicesOffered, specialization, or expertise fields
   * @param {Array|string} services - Array of services or single service string
   * @returns {string} - Comma-separated services string
   */
  const formatServices = (services) => {
    if (!services) return 'Not specified';
    
    if (Array.isArray(services)) {
      return services.length > 0 ? services.join(', ') : 'Not specified';
    }
    
    return String(services);
  };

  /**
   * Format rating display with stars
   * @param {number} rating - Rating value (0-5)
   * @returns {JSX.Element} - Star rating display
   */
  const renderRating = (rating) => {
    const ratingValue = Number(rating) || 0;
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} className="w-4 h-4 fill-accent text-accent" />;
          } else if (index === fullStars && hasHalfStar) {
            return (
              <Star
                key={index}
                className="w-4 h-4 fill-accent text-accent"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            );
          } else {
            return <Star key={index} className="w-4 h-4 text-muted" />;
          }
        })}
        <span className="ml-1 text-sm font-medium text-textSecondary">{ratingValue.toFixed(1)}</span>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-textSecondary">Loading construction providers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && providers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <Building2 className="w-16 h-16 mx-auto text-error" />
          </div>
          <h2 className="text-2xl font-bold text-textMain mb-2">Error Loading Providers</h2>
          <p className="text-textSecondary mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.location.reload()} variant="primary">
              Try Again
            </Button>
            <Button onClick={() => navigate('/construction-request')} variant="outline">
              Request Service Anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no providers available
  if (providers.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="mb-6">
              <Building2 className="w-16 h-16 mx-auto text-muted" />
            </div>
            <h2 className="text-2xl font-bold text-textMain mb-4">
              No Construction Providers Available
            </h2>
            <p className="text-lg text-textSecondary mb-8 max-w-2xl mx-auto">
              No approved construction providers are currently available. You can still submit a construction
              request, and a provider will be assigned automatically.
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/construction-request')}>
              Request Construction Service
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-textMain mb-2 break-words">
            Construction Service Providers
          </h1>
          <p className="text-base sm:text-lg text-textSecondary break-words">
            Browse our trusted construction service providers and request a quote for your project.
          </p>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-surface rounded-base shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              {/* Card Content */}
              <div className="p-6">
                {/* Provider Name - Clickable to view details */}
                <Link to={`/construction-provider/${provider.userId || provider.id}`} className="block mb-3 group">
                  <h3 className="text-xl font-semibold text-textMain group-hover:text-primary transition-colors break-words">
                    {provider.name || provider.companyName || 'Unnamed Provider'}
                  </h3>
                  {provider.companyName && provider.name && (
                    <p className="text-sm text-textSecondary mt-1 break-words">{provider.companyName}</p>
                  )}
                </Link>

                {/* Location */}
                {(provider.location || provider.city) && (
                  <div className="flex items-center text-sm text-textSecondary mb-3">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" aria-hidden="true" />
                    <span className="break-words">{provider.location || provider.city}</span>
                  </div>
                )}

                {/* Experience */}
                {provider.experience !== undefined && provider.experience !== null && (
                  <div className="mb-3">
                    <p className="text-sm text-textSecondary">
                      <span className="font-medium">Experience:</span> {provider.experience} {provider.experience === 1 ? 'year' : 'years'}
                    </p>
                  </div>
                )}

                {/* Services Offered */}
                {(provider.servicesOffered || provider.specialization || provider.expertise) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-textSecondary mb-2">Services:</h4>
                    <p className="text-sm text-textSecondary break-words">
                      {formatServices(provider.servicesOffered || provider.specialization || provider.expertise)}
                    </p>
                  </div>
                )}

                {/* Rating */}
                {provider.rating !== undefined && provider.rating !== null && (
                  <div className="mb-4">{renderRating(provider.rating)}</div>
                )}

                {/* Contact Information */}
                <div className="space-y-2 mb-6">
                  {provider.phone && (
                    <div className="flex items-center text-sm text-textSecondary">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
                      <a href={`tel:${provider.phone}`} className="break-all hover:text-primary">
                        {provider.phone}
                      </a>
                    </div>
                  )}

                  {provider.email && (
                    <div className="flex items-center text-sm text-textSecondary">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
                      <a href={`mailto:${provider.email}`} className="break-all hover:text-primary">
                        {provider.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleRequestService(provider.userId || provider.id)}
                    className="!bg-primary !text-white hover:!bg-primaryDark border-2 border-primary hover:border-primaryDark shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                  >
                    Request Service
                  </Button>
                  <Link to={`/construction-provider/${provider.userId || provider.id}`}>
                    <Button
                      variant="outline"
                      fullWidth
                      className="border-muted text-textSecondary hover:bg-muted"
                      aria-label={`View details for ${provider.name || provider.companyName || 'provider'}`}
                    >
                      <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConstructionList;
