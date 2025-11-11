import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Phone, Mail, MapPin, ArrowLeft, Building2, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReviewsAndRatings from './ReviewsAndRatings';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

/**
 * ConstructionProviderDetail Component
 * 
 * Displays detailed information about a construction service provider.
 * Shows provider details, contact information, and reviews.
 */
const ConstructionProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
        console.error('Error fetching provider:', err);
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
            return (
              <Star
                key={index}
                className="w-5 h-5 fill-yellow-400 text-yellow-400"
              />
            );
          } else if (index === fullStars + 1 && hasHalfStar) {
            return (
              <Star
                key={index}
                className="w-5 h-5 fill-yellow-400 text-yellow-400"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            );
          } else {
            return (
              <Star
                key={index}
                className="w-5 h-5 text-gray-300"
              />
            );
          }
        })}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {ratingValue.toFixed(1)}
        </span>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4 font-inter text-lg">
            {error || 'Provider not found'}
          </p>
          <Button onClick={() => navigate(-1)} variant="primary">
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-yellow-600">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/construction-services" className="hover:text-yellow-600">
            Construction Services
          </Link>
          <span className="mx-2">/</span>
          <Link to="/construction-list" className="hover:text-yellow-600">
            Providers
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{provider.name}</span>
        </nav>

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Providers
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {/* Provider Header */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-8 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
                    {provider.name || 'Unnamed Provider'}
                  </h1>
                  {provider.rating !== undefined && provider.rating !== null && (
                    <div className="flex items-center gap-2">
                      {renderRating(provider.rating)}
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={handleRequestService}
                className="bg-white text-slate-600 hover:bg-slate-50 border-white"
                size="lg"
              >
                Request Service
              </Button>
            </div>
          </div>

          {/* Provider Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Expertise */}
                {provider.expertise && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Expertise
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {formatExpertise(provider.expertise)}
                    </p>
                  </div>
                )}

                {/* Bio */}
                {provider.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      About
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {provider.bio}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {provider.experienceYears && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Experience
                    </h3>
                    <p className="text-gray-700">
                      {provider.experienceYears} years of experience
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Contact Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    {provider.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <a
                            href={`tel:${provider.phone}`}
                            className="text-gray-900 hover:text-yellow-600 font-medium"
                          >
                            {provider.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {provider.email && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <a
                            href={`mailto:${provider.email}`}
                            className="text-gray-900 hover:text-yellow-600 font-medium"
                          >
                            {provider.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {provider.address && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="text-gray-900 font-medium">
                            {provider.address}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reviews & Ratings Section */}
        {id && (
          <div className="mt-8">
            <ReviewsAndRatings key={id} targetId={id} targetType="service" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionProviderDetail;

