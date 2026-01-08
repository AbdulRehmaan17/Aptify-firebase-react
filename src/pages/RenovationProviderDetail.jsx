import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Phone, Mail, MapPin, ArrowLeft, Wrench, AlertCircle, MessageSquare } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReviewsAndRatings from './ReviewsAndRatings';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatAddress, safeText } from '../utils/formatHelpers';
import { useAuth } from '../context/AuthContext';

/**
 * RenovationProviderDetail Component
 *
 * Displays detailed information about a renovation service provider.
 * Shows provider details, contact information, and reviews.
 */
const RenovationProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!id) {
        setError('Provider ID is required');
        setLoading(false);
        return;
      }

      if (!db) {
        setError('Database not initialized');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // The ID in URL might be either:
        // 1. Document ID in 'renovators' collection
        // 2. Document ID in 'serviceProviders' collection  
        // 3. userId (need to query by userId field)

        let providerData = null;

        // Strategy 1: Try as document ID in 'renovators' collection (most common)
        try {
          const renovatorRef = doc(db, 'renovators', id);
          const renovatorSnap = await getDoc(renovatorRef);
          if (renovatorSnap.exists()) {
            providerData = {
              id: renovatorSnap.id,
              ...renovatorSnap.data(),
            };
          }
        } catch (err) {
          console.warn('Error checking renovators collection:', err);
        }

        // Strategy 2: If not found, try as document ID in 'serviceProviders' collection
        if (!providerData) {
          try {
            const serviceProviderRef = doc(db, 'serviceProviders', id);
            const serviceProviderSnap = await getDoc(serviceProviderRef);
            if (serviceProviderSnap.exists()) {
              const data = serviceProviderSnap.data();
              // Only use if it's a Renovation provider
              if (!data.serviceType || data.serviceType === 'Renovation') {
                providerData = {
                  id: serviceProviderSnap.id,
                  ...data,
                };
              }
            }
          } catch (err) {
            console.warn('Error checking serviceProviders collection:', err);
          }
        }

        // Strategy 3: If still not found, try finding by userId field
        if (!providerData) {
          try {
            const { queryCollection } = await import('../utils/firestoreQueryWrapper');
            
            // Try renovators collection first
            const renovatorsResult = await queryCollection(
              'renovators',
              { userId: id },
              { limitCount: 1 }
            );
            
            if (renovatorsResult.data.length > 0) {
              providerData = renovatorsResult.data[0];
            } else {
              // Try serviceProviders with userId and serviceType filter
              const serviceProvidersResult = await queryCollection(
                'serviceProviders',
                { userId: id },
                { limitCount: 10 } // Get more to filter client-side
              );
              
              // Filter for Renovation type client-side
              const renovationProviders = serviceProvidersResult.data.filter(
                p => !p.serviceType || p.serviceType === 'Renovation'
              );
              
              if (renovationProviders.length > 0) {
                providerData = renovationProviders[0];
              }
            }
          } catch (err) {
            console.warn('Error querying by userId:', err);
          }
        }

        // If still not found, show error
        if (!providerData) {
          setError('Provider not found');
          setLoading(false);
          return;
        }

        setProvider(providerData);
      } catch (err) {
        console.error('Error fetching provider:', err);
        // Don't block navigation - show error but allow page to render
        setError(err.message || 'Failed to load provider details.');
        toast.error('Failed to load provider.');
        // Set provider to null so error state shows
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  /**
   * Render star rating display
   */
  const renderRating = (rating) => {
    const ratingValue = rating || 0;
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((index) => {
          if (index <= fullStars) {
            return <Star key={index} className="w-5 h-5 fill-accent text-accent" />;
          } else if (index === fullStars + 1 && hasHalfStar) {
            return (
              <Star
                key={index}
                className="w-5 h-5 fill-accent text-accent"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            );
          } else {
            return <Star key={index} className="w-5 h-5 text-muted" />;
          }
        })}
        <span className="ml-2 text-sm font-medium text-textSecondary">{ratingValue.toFixed(1)}</span>
      </div>
    );
  };

  /**
   * Format expertise array to string
   */
  const formatExpertise = (expertise) => {
    if (Array.isArray(expertise)) {
      return expertise.join(', ');
    }
    if (typeof expertise === 'string') {
      return expertise;
    }
    return 'Not specified';
  };

  /**
   * Handle request service
   */
  const handleRequestService = () => {
    navigate(`/renovation-request?providerId=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <p className="text-error mb-4 font-inter text-lg">{error || 'Provider not found'}</p>
          <Button onClick={() => navigate(-1)} variant="primary">
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <nav className="text-sm text-textSecondary mb-6">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/services" className="hover:text-primary">
            Renovation Services
          </Link>
          <span className="mx-2">/</span>
          <Link to="/renovation-list" className="hover:text-primary">
            Providers
          </Link>
          <span className="mx-2">/</span>
          <span className="text-textMain">{provider.name}</span>
        </nav>

        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Providers
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-surface rounded-base shadow-lg overflow-hidden"
        >
          {/* Provider Header */}
          <div className="bg-gradient-to-r from-primary to-primaryDark p-6 sm:p-8 text-white relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="bg-surface/20 rounded-full p-3 sm:p-4 backdrop-blur-sm flex-shrink-0">
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-2 break-words">
                    {safeText(provider.name, 'Unnamed Provider')}
                  </h1>
                  {provider.rating !== undefined && provider.rating !== null && (
                    <div className="flex items-center gap-2">{renderRating(provider.rating)}</div>
                  )}
                </div>
              </div>
              <div className="relative z-10 w-full md:w-auto flex-shrink-0">
                <Button
                  onClick={handleRequestService}
                  variant="outline"
                  className="!bg-white !text-primary hover:!bg-primary hover:!text-white border-2 !border-white/30 hover:!border-white !shadow-lg hover:!shadow-xl transition-all duration-200 font-semibold opacity-100 visible w-full md:w-auto"
                  size="lg"
                  aria-label="Request renovation service"
                >
                  Request Service
                </Button>
              </div>
            </div>
          </div>

          {/* Provider Details */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Expertise */}
                {provider.expertise && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-3">Expertise</h3>
                    <p className="text-textSecondary leading-relaxed break-words">
                      {formatExpertise(provider.expertise)}
                    </p>
                  </div>
                )}

                {/* Bio */}
                {provider.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-3">About</h3>
                    <p className="text-textSecondary leading-relaxed break-words">{provider.bio}</p>
                  </div>
                )}

                {/* Experience */}
                {provider.experienceYears && (
                  <div>
                    <h3 className="text-lg font-semibold text-textMain mb-3">Experience</h3>
                    <p className="text-textSecondary break-words">{provider.experienceYears} years of experience</p>
                  </div>
                )}
              </div>

              {/* Right Column - Contact Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-textMain mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    {provider.phone && typeof provider.phone === 'string' && provider.phone.trim() && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Phone className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-textSecondary">Phone</p>
                          <a
                            href={`tel:${provider.phone}`}
                            className="text-textMain hover:text-primary font-medium break-all"
                            aria-label={`Call ${safeText(provider.phone)}`}
                          >
                            {safeText(provider.phone)}
                          </a>
                        </div>
                      </div>
                    )}

                    {provider.email && typeof provider.email === 'string' && provider.email.trim() && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Mail className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-textSecondary">Email</p>
                          <a
                            href={`mailto:${provider.email}`}
                            className="text-textMain hover:text-primary font-medium break-all"
                            aria-label={`Email ${safeText(provider.email)}`}
                          >
                            {safeText(provider.email)}
                          </a>
                        </div>
                      </div>
                    )}

                    {provider.address && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-textSecondary">Address</p>
                          <p className="text-textMain font-medium break-words">
                            {formatAddress(provider.address)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Provider Button */}
                {user && provider.userId && user.uid !== provider.userId && (
                  <div className="mt-6">
                    <Button
                      className="w-full bg-primary hover:bg-primaryDark text-white"
                      onClick={async () => {
                        try {
                          const { findOrCreateConversation } = await import('../utils/chatHelpers');
                          const chatId = await findOrCreateConversation(user.uid, provider.userId);
                          navigate(`/chat?chatId=${chatId}`);
                        } catch (error) {
                          console.error('Error creating chat:', error);
                          toast.error('Failed to start chat. Please try again.');
                        }
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact Provider
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reviews & Ratings Section */}
        {id && (
          <div className="mt-8">
            <ReviewsAndRatings key={id} targetId={id} targetType="renovation" />
          </div>
        )}
      </div>
    </div>
  );
};

export default RenovationProviderDetail;
