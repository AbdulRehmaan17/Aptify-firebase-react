import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, Wrench, MapPin, Phone, Mail, Star, Filter, Search } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * ProvidersList.jsx
 * Public page displaying all approved providers (renovators and constructors)
 */
const ProvidersList = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'renovator', 'constructor', or ''

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        if (!db) {
          console.warn('Firestore db is not initialized');
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
          return;
        }

        // Query providers collection - public read access
        const providersQuery = query(
          collection(db, 'providers'),
          orderBy('createdAt', 'desc')
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
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Please check Firestore rules.');
        } else {
          toast.error('Failed to load providers');
        }
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

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((p) => p.type?.toLowerCase() === typeFilter.toLowerCase());
    }

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(searchLower) ||
          p.companyName?.toLowerCase().includes(searchLower) ||
          p.city?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          (Array.isArray(p.serviceCategories) &&
            p.serviceCategories.some((cat) => cat?.toLowerCase().includes(searchLower))) ||
          (Array.isArray(p.constructionServices) &&
            p.constructionServices.some((srv) => srv?.toLowerCase().includes(searchLower)))
      );
    }

    setFilteredProviders(filtered);
  }, [providers, searchTerm, typeFilter]);

  // Get unique cities for filter
  const cities = [...new Set(providers.map((p) => p.city).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">
            Approved Service Providers
          </h1>
          <p className="text-textSecondary">
            Browse our verified renovators and constructors
          </p>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-lg shadow-sm border border-muted p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-textSecondary mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search Providers
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, company, city, or services..."
                className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Provider Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Types</option>
                <option value="renovator">Renovators</option>
                <option value="constructor">Constructors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-textSecondary">
          Showing {filteredProviders.length} of {providers.length} providers
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="bg-surface rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <p className="text-textSecondary text-lg">
              {providers.length === 0
                ? 'No providers available yet'
                : 'No providers match your search criteria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-surface rounded-lg shadow-sm border border-muted p-6 hover:shadow-md transition-shadow"
              >
                {/* Provider Image/Icon */}
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                    {provider.type === 'renovator' ? (
                      <Wrench className="w-8 h-8 text-primary" />
                    ) : (
                      <Building2 className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-textMain">
                      {provider.fullName || 'N/A'}
                    </h3>
                    {provider.companyName && (
                      <p className="text-sm text-textSecondary">{provider.companyName}</p>
                    )}
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                        provider.type === 'renovator'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {provider.type === 'renovator' ? 'Renovator' : 'Constructor'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {provider.description && (
                  <p className="text-sm text-textSecondary mb-4 line-clamp-2">
                    {provider.description}
                  </p>
                )}

                {/* Location */}
                {provider.city && (
                  <div className="flex items-center text-sm text-textSecondary mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{provider.city}</span>
                    {provider.officeAddress && (
                      <span className="ml-2">• {provider.officeAddress}</span>
                    )}
                  </div>
                )}

                {/* Experience */}
                {provider.experience && (
                  <div className="text-sm text-textSecondary mb-4">
                    <strong>Experience:</strong> {provider.experience} years
                  </div>
                )}

                {/* Services */}
                {(provider.serviceCategories?.length > 0 ||
                  provider.constructionServices?.length > 0) && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-textSecondary mb-2">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {(provider.serviceCategories || provider.constructionServices || [])
                        .slice(0, 3)
                        .map((service, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-muted text-textSecondary text-xs rounded"
                          >
                            {service}
                          </span>
                        ))}
                      {((provider.serviceCategories || provider.constructionServices || []).length >
                        3 && (
                        <span className="px-2 py-1 text-textSecondary text-xs">
                          +{((provider.serviceCategories || provider.constructionServices || []).length - 3)} more
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio Preview */}
                {provider.portfolio && provider.portfolio.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-textSecondary mb-2">Portfolio:</p>
                    <div className="flex gap-2">
                      {provider.portfolio.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Portfolio ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded border border-muted"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Button */}
                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={() => {
                    // TODO: Implement contact functionality
                    toast.info('Contact functionality coming soon');
                  }}
                >
                  Contact Provider
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvidersList;

