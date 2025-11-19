import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, Phone, Mail, Building2, Eye } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * ConstructionList Component
 *
 * Displays a list of construction service providers from Firestore.
 * Fetches providers from "serviceProviders" collection where serviceType == "Construction".
 * Seeds default providers if collection is empty.
 * Each provider card shows name, expertise, rating, and contact information.
 * Users can click "Request Service" to navigate to the construction request form.
 */
const ConstructionList = () => {
  const navigate = useNavigate();

  // State management
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);

  /**
   * Seed default construction providers if collection is empty
   * This function creates sample providers for first-time setup
   * @returns {Promise<void>}
   */
  const seedDefaultProviders = async () => {
    try {
      setSeeding(true);
      console.log('Seeding default construction providers...');

      const defaultProviders = [
        {
          name: 'Malik Builders',
          serviceType: 'Construction',
          expertise: ['House Construction', 'Interior Finishing', 'Renovation'],
          rating: 4.5,
          phone: '+92 300 123-4567',
          email: 'info@malikbuilders.com',
          createdAt: serverTimestamp(),
        },
        {
          name: 'Urban Construct',
          serviceType: 'Construction',
          expertise: ['Commercial Building', 'Grey Structure', 'Architectural Design'],
          rating: 4.7,
          phone: '+92 300 234-5678',
          email: 'contact@urbanconstruct.com',
          createdAt: serverTimestamp(),
        },
      ];

      // Add each provider to Firestore
      const addPromises = defaultProviders.map((provider) =>
        addDoc(collection(db, 'serviceProviders'), provider)
      );

      await Promise.all(addPromises);
      console.log(`Seeded ${defaultProviders.length} default construction providers`);
      toast.success('Default providers have been added.');
    } catch (err) {
      console.error('Error seeding default providers:', err);
      toast.error('Failed to seed default providers. Please try again.');
      throw err;
    } finally {
      setSeeding(false);
    }
  };

  /**
   * Fetch construction providers from Firestore
   * Queries "serviceProviders" collection where serviceType == "Construction"
   * Seeds default providers if collection is empty
   */
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query serviceProviders collection filtered by serviceType == "Construction"
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('serviceType', '==', 'Construction')
        );

        const snapshot = await getDocs(providersQuery);

        // Map documents to array with id
        const providersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`Fetched ${providersList.length} construction providers`);

        // If no providers found, seed default providers
        if (providersList.length === 0) {
          console.log('No providers found. Seeding default providers...');
          try {
            await seedDefaultProviders();

            // Fetch again after seeding
            const newSnapshot = await getDocs(providersQuery);
            const newProvidersList = newSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            setProviders(newProvidersList);
            console.log(`Fetched ${newProvidersList.length} providers after seeding`);
          } catch (seedError) {
            console.error('Error during seeding:', seedError);
            // Continue even if seeding fails - show empty state
            setProviders([]);
          }
        } else {
          setProviders(providersList);
        }
      } catch (err) {
        console.error('Error fetching construction providers:', err);

        // Handle case where collection doesn't exist gracefully
        if (err.code === 'permission-denied' || err.message?.includes('permission')) {
          setError('Permission denied. Please check Firestore security rules.');
          toast.error('Permission denied. Please contact administrator.');
        } else if (err.code === 'not-found' || err.message?.includes('not found')) {
          // Collection doesn't exist - this is okay, we'll seed it
          console.log('Collection does not exist yet. Seeding default providers...');
          try {
            await seedDefaultProviders();
            // Retry fetch after seeding
            const providersQuery = query(
              collection(db, 'serviceProviders'),
              where('serviceType', '==', 'Construction')
            );
            const newSnapshot = await getDocs(providersQuery);
            const newProvidersList = newSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setProviders(newProvidersList);
          } catch (seedError) {
            console.error('Error during seeding:', seedError);
            setProviders([]);
          }
        } else {
          setError(err.message || 'Failed to load construction providers');
          toast.error('Failed to load construction providers. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
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
   * Format expertise array as comma-separated string
   * @param {Array} expertise - Array of expertise areas
   * @returns {string} - Comma-separated expertise string
   */
  const formatExpertise = (expertise) => {
    if (!expertise || !Array.isArray(expertise)) {
      return 'Not specified';
    }
    return expertise.join(', ');
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
            return <Star key={index} className="w-4 h-4 fill-yellow-400 text-yellow-400" />;
          } else if (index === fullStars && hasHalfStar) {
            return (
              <Star
                key={index}
                className="w-4 h-4 fill-yellow-400 text-yellow-400"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            );
          } else {
            return <Star key={index} className="w-4 h-4 text-gray-300" />;
          }
        })}
        <span className="ml-1 text-sm font-medium text-gray-700">{ratingValue.toFixed(1)}</span>
      </div>
    );
  };

  // Loading state (including seeding state)
  if (loading || seeding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          {seeding && <p className="mt-4 text-gray-600">Setting up default providers...</p>}
        </div>
      </div>
    );
  }

  // Error state
  if (error && providers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <Building2 className="w-16 h-16 mx-auto text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Providers</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="mb-6">
              <Building2 className="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Construction Providers Available
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              No construction providers are currently available. You can still submit a construction
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Construction Service Providers
          </h1>
          <p className="text-lg text-gray-600">
            Browse our trusted construction service providers and request a quote for your project.
          </p>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              {/* Card Content */}
              <div className="p-6">
                {/* Provider Name - Clickable to view details */}
                <Link to={`/construction-provider/${provider.id}`} className="block mb-3 group">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-slate-600 transition-colors">
                    {provider.name || 'Unnamed Provider'}
                  </h3>
                </Link>

                {/* Rating */}
                {provider.rating !== undefined && provider.rating !== null && (
                  <div className="mb-4">{renderRating(provider.rating)}</div>
                )}

                {/* Expertise */}
                {provider.expertise && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Expertise:</h4>
                    <p className="text-sm text-gray-600">{formatExpertise(provider.expertise)}</p>
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-2 mb-6">
                  {provider.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{provider.phone}</span>
                    </div>
                  )}

                  {provider.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{provider.email}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleRequestService(provider.id)}
                  >
                    Request Service
                  </Button>
                  <Link to={`/construction-provider/${provider.id}`}>
                    <Button
                      variant="outline"
                      fullWidth
                      className="border-slate-500 text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
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
