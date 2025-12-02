import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, Star, MapPin, Phone, Mail, Filter, Search, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * ConstructionProviders.jsx
 * Displays list of approved construction providers with filtering
 */
const ConstructionProviders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    specialization: '',
  });

  // Get unique cities and specializations for filters
  const cities = [...new Set(providers.map((p) => p.city).filter(Boolean))].sort();
  const specializations = [
    ...new Set(
      providers
        .flatMap((p) => (Array.isArray(p.specialization) ? p.specialization : [p.specialization || p.expertise]))
        .filter(Boolean)
    ),
  ].sort();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        // Fetch only approved providers
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('serviceType', '==', 'construction'),
          where('isApproved', '==', true)
        );

        const snapshot = await getDocs(providersQuery);
        const providersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProviders(providersList);
        setFilteredProviders(providersList);
      } catch (error) {
        console.error('Error fetching providers:', error);
        toast.error('Failed to load construction providers');
        setProviders([]);
        setFilteredProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...providers];

    // Apply city filter
    if (filters.city) {
      filtered = filtered.filter((p) => p.city?.toLowerCase() === filters.city.toLowerCase());
    }

    // Apply specialization filter
    if (filters.specialization) {
      filtered = filtered.filter((p) => {
        const specs = Array.isArray(p.specialization)
          ? p.specialization
          : Array.isArray(p.expertise)
            ? p.expertise
            : [p.specialization || p.expertise];
        return specs.some((spec) =>
          spec?.toLowerCase().includes(filters.specialization.toLowerCase())
        );
      });
    }

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(term);
        const cityMatch = p.city?.toLowerCase().includes(term);
        const specMatch = Array.isArray(p.specialization)
          ? p.specialization.some((s) => s.toLowerCase().includes(term))
          : p.specialization?.toLowerCase().includes(term) ||
            p.expertise?.toLowerCase().includes(term);
        return nameMatch || cityMatch || specMatch;
      });
    }

    setFilteredProviders(filtered);
  }, [providers, filters, searchTerm]);

  const handleRequestService = (providerId) => {
    if (!user) {
      toast.error('Please log in to request construction service');
      navigate('/auth');
      return;
    }
    navigate(`/request-construction?providerId=${providerId}`);
  };

  const formatRating = (rating) => {
    if (!rating || rating === 0) return 'No ratings yet';
    return `${rating.toFixed(1)} / 5.0`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">
            Construction Providers
          </h1>
          <p className="text-lg text-textSecondary">
            Browse verified construction professionals for your project
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card-base p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, city, or specialization..."
                  className="w-full pl-10 pr-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface"
                />
              </div>
            </div>
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Filter by City
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter by Specialization
              </label>
              <select
                value={filters.specialization}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, specialization: e.target.value }))
                }
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.city || filters.specialization || searchTerm) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({ city: '', specialization: '' });
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-textSecondary">
            Showing {filteredProviders.length} of {providers.length} providers
          </p>
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted mb-4" />
            <h3 className="text-xl font-semibold text-textMain mb-2">No Providers Found</h3>
            <p className="text-textSecondary mb-6">
              {providers.length === 0
                ? 'No approved construction providers available yet.'
                : 'Try adjusting your filters or search criteria.'}
            </p>
            {providers.length === 0 && user && (
              <Button onClick={() => navigate('/register-constructor')}>
                Become a Provider
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="card-base hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Provider Image */}
                <div className="relative h-48 bg-muted">
                  {provider.profileImageUrl || provider.profileImage ? (
                    <img
                      src={provider.profileImageUrl || provider.profileImage}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-muted" />
                    </div>
                  )}
                  {/* Verified Badge */}
                  {(provider.isApproved || provider.approved) && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </div>
                    </div>
                  )}
                </div>

                {/* Provider Info */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-textMain mb-2">{provider.name}</h3>

                  {/* Rating */}
                  <div className="flex items-center mb-3">
                    <Star className="w-5 h-5 text-accent fill-current" />
                    <span className="ml-2 text-sm text-textSecondary">
                      {formatRating(provider.rating)}
                    </span>
                    {provider.totalProjects > 0 && (
                      <span className="ml-2 text-xs text-textSecondary">
                        ({provider.totalProjects} projects)
                      </span>
                    )}
                  </div>

                  {/* City */}
                  {provider.city && (
                    <div className="flex items-center text-textSecondary mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{provider.city}</span>
                    </div>
                  )}

                  {/* Specialization */}
                  <div className="mb-4">
                    <p className="text-xs text-textSecondary mb-1">Specialization:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(provider.specialization)
                        ? provider.specialization
                        : Array.isArray(provider.expertise)
                          ? provider.expertise
                          : [provider.specialization || provider.expertise]
                      )
                        .slice(0, 3)
                        .map((spec, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-base"
                          >
                            {spec}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Experience */}
                  {provider.experience || provider.experienceYears ? (
                    <p className="text-sm text-textSecondary mb-4">
                      {provider.experience || provider.experienceYears} years of experience
                    </p>
                  ) : null}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRequestService(provider.id)}
                    >
                      Request Service
                    </Button>
                    <Link to={`/construction-provider/${provider.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionProviders;

