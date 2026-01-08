import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Phone, Mail, MapPin, ArrowLeft, Building2, AlertCircle, MessageSquare } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReviewsAndRatings from './ReviewsAndRatings';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatAddress } from '../utils/safeRender';
import { useAuth } from '../context/AuthContext';

/**
 * ConstructionProviderDetail Component
 *
 * Displays detailed information about a construction service provider.
 * Shows provider details, contact information, and reviews.
 */
const ConstructionProviderDetail = () => {
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

      try {
        setLoading(true);
        setError(null);

        const providerRef = doc(db, 'serviceProviders', id);
        const providerSnap = await getDoc(providerRef);

        if (!providerSnap.exists()) {
          setError('Provider not found');
          setLoading(false);
          return;
        }

        const providerData = {
          id: providerSnap.id,
          ...providerSnap.data(),
        };

        // Verify service type matches
        if (providerData.serviceType !== 'Construction') {
          setError('This provider is not a Construction service provider');
          setLoading(false);
          return;
        }

        setProvider(providerData);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Error fetching provider:', err);
        }
        setError(err.message || 'Failed to load provider details.');
        toast.error('Failed to load provider.');
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
    navigate(`/construction-request?providerId=${id}`);
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
          <Link to="/construction-services" className="hover:text-primary">
            Construction Services
          </Link>
          <span className="mx-2">/</span>
          <Link to="/construction-list" className="hover:text-primary">
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
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-2 break-words">
                    {provider.name || 'Unnamed Provider'}
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
                  aria-label="Request construction service"
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
                    {provider.phone && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Phone className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-textSecondary">Phone</p>
                          <a
                            href={`tel:${provider.phone}`}
                            className="text-textMain hover:text-primary font-medium break-all"
                            aria-label={`Call ${provider.phone}`}
                          >
                            {provider.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {provider.email && (
                      <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                        <Mail className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-textSecondary">Email</p>
                          <a
                            href={`mailto:${provider.email}`}
                            className="text-textMain hover:text-primary font-medium break-all"
                            aria-label={`Email ${provider.email}`}
                          >
                            {provider.email}
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
                      aria-label="Contact provider via chat"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
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
            <ReviewsAndRatings key={id} targetId={id} targetType="construction" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionProviderDetail;
