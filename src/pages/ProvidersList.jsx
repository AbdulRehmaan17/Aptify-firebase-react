import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
  const { user, loading: authLoading } = useAuth();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'renovator', 'constructor', or ''

  useEffect(() => {
    // Wait for auth to initialize, but don't require user to be logged in
    if (authLoading || !db) {
      if (!authLoading && !db) {
        console.warn('Firestore db is not initialized');
        setProviders([]);
        setFilteredProviders([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    // CRITICAL: Query constructionProviders collection where contractors are stored
    console.log('🔍 DEBUG: Setting up query for constructionProviders collection');

    // First, diagnostic check to see all documents
    getDocs(collection(db, 'constructionProviders'))
      .then((allSnapshot) => {
        console.log('🔍 DEBUG: Total documents in constructionProviders:', allSnapshot.size);
        if (allSnapshot.size > 0) {
          console.log('🔍 DEBUG: Sample documents:');
          allSnapshot.docs.slice(0, 3).forEach((docSnap) => {
            const data = docSnap.data();
            console.log(`  - ID: ${docSnap.id}`, {
              approved: data.approved,
              isActive: data.isActive,
              name: data.name,
              companyName: data.companyName,
              city: data.city,
            });
          });
        } else {
          console.warn('⚠️ WARNING: No documents found in constructionProviders collection');
        }
      })
      .catch((diagError) => {
        console.warn('🔍 DEBUG: Error checking collection:', diagError);
      });

    // Query constructionProviders with filters: approved === true AND isActive === true
    const providersQuery = query(
      collection(db, 'constructionProviders'),
      where('approved', '==', true),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    console.log('🔍 DEBUG: Setting up real-time listener for constructionProviders');

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      providersQuery,
      (snapshot) => {
        console.log('✅ SUCCESS: constructionProviders query - Snapshot size:', snapshot.size);
        console.log('✅ SUCCESS: Raw snapshot docs count:', snapshot.docs.length);

        const providersList = snapshot.docs.map((doc) => {
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
            type: 'constructor', // All providers from constructionProviders are constructors
          };
        });

        console.log('✅ SUCCESS: Construction providers fetched:', providersList.length, 'providers');
        if (providersList.length > 0) {
          console.log('✅ SUCCESS: First provider sample:', {
            id: providersList[0].id,
            name: providersList[0].name,
            companyName: providersList[0].companyName,
            city: providersList[0].city,
            approved: providersList[0].approved,
            isActive: providersList[0].isActive,
          });
        } else {
          console.warn('⚠️ WARNING: No approved and active contractors found');
        }

        setProviders(providersList);
        setFilteredProviders(providersList);
        setLoading(false);
      },
      (error) => {
        console.error('❌ ERROR: Error fetching constructionProviders:', error);
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Please check Firestore rules.');
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
        } else if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          // Fallback: query without orderBy if index is missing
          console.warn('⚠️ WARNING: Index required for query. Falling back to query without orderBy.');
          const fallbackQuery = query(
            collection(db, 'constructionProviders'),
            where('approved', '==', true),
            where('isActive', '==', true)
          );
          getDocs(fallbackQuery)
            .then((snapshot) => {
              console.log('✅ SUCCESS (Fallback): constructionProviders - Snapshot size:', snapshot.size);
              const providersList = snapshot.docs.map((doc) => {
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
                  type: 'constructor',
                };
              });
              
              // Sort by createdAt descending (client-side)
              providersList.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return bTime - aTime;
              });
              
              console.log('✅ SUCCESS (Fallback): Construction providers fetched:', providersList.length, 'providers');
              setProviders(providersList);
              setFilteredProviders(providersList);
              setLoading(false);
            })
            .catch((fallbackError) => {
              console.error('❌ ERROR: Fallback query failed:', fallbackError);
              // Last resort: fetch all and filter client-side
              console.warn('⚠️ WARNING: Trying to fetch all constructionProviders documents...');
              getDocs(collection(db, 'constructionProviders'))
                .then((allSnapshot) => {
                  console.log('🔍 DEBUG: All constructionProviders - Snapshot size:', allSnapshot.size);
                  const allProviders = allSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'constructor',
                  }));
                  // Filter approved and active providers client-side
                  const filtered = allProviders.filter(p => 
                    p.approved === true && p.isActive === true
                  );
                  console.log('✅ SUCCESS (Client-side filter): Construction providers:', filtered.length, 'providers');
                  // Sort by createdAt descending
                  filtered.sort((a, b) => {
                    const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
                    const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
                    return bTime - aTime;
                  });
                  setProviders(filtered);
                  setFilteredProviders(filtered);
                  setLoading(false);
                })
                .catch((finalError) => {
                  console.error('❌ ERROR: Final fallback query failed:', finalError);
                  toast.error('Failed to load construction providers');
                  setProviders([]);
                  setFilteredProviders([]);
                  setLoading(false);
                });
            });
        } else {
          toast.error('Failed to load construction providers');
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
        }
      }
    );

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [authLoading]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...providers];

    // Apply type filter (all providers from constructionProviders are constructors)
    if (typeFilter) {
      if (typeFilter === 'constructor') {
        // All providers are constructors, so show all (no filtering needed)
      } else if (typeFilter === 'renovator') {
        // No renovators in constructionProviders, so show none
        filtered = [];
      }
    }

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.name || p.fullName || '').toLowerCase().includes(searchLower) ||
          (p.companyName || '').toLowerCase().includes(searchLower) ||
          (p.city || p.location || p.address || '').toLowerCase().includes(searchLower) ||
          (p.description || p.bio || '').toLowerCase().includes(searchLower) ||
          // Check servicesOffered array (used in constructionProviders)
          (Array.isArray(p.servicesOffered) &&
            p.servicesOffered.some((srv) => String(srv).toLowerCase().includes(searchLower))) ||
          // Check specialization array
          (Array.isArray(p.specialization) &&
            p.specialization.some((spec) => String(spec).toLowerCase().includes(searchLower))) ||
          // Check expertise array
          (Array.isArray(p.expertise) &&
            p.expertise.some((exp) => String(exp).toLowerCase().includes(searchLower)))
      );
    }

    setFilteredProviders(filtered);
  }, [providers, searchTerm, typeFilter]);

  // Get unique cities for filter
  const cities = [...new Set(providers.map((p) => p.city || p.location || p.address).filter(Boolean))].sort();

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
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-textMain">
                      {provider.name || provider.fullName || 'N/A'}
                    </h3>
                    {provider.companyName && (
                      <p className="text-sm text-textSecondary font-semibold">
                        {provider.companyName}
                      </p>
                    )}
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      Constructor
                    </span>
                  </div>
                </div>

                {/* Description */}
                {(provider.description || provider.bio) && (
                  <p className="text-sm text-textSecondary mb-4 line-clamp-2">
                    {provider.description || provider.bio}
                  </p>
                )}

                {/* Location */}
                {(provider.city || provider.location || provider.address) && (
                  <div className="flex items-center text-sm text-textSecondary mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{provider.city || provider.location || provider.address}</span>
                  </div>
                )}

                {/* Experience */}
                {provider.experience && (
                  <div className="text-sm text-textSecondary mb-4">
                    <strong>Experience:</strong> {provider.experience} years
                  </div>
                )}

                {/* Services */}
                {(provider.servicesOffered?.length > 0 || provider.specialization?.length > 0 || provider.expertise?.length > 0) && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-textSecondary mb-2">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {(provider.servicesOffered || provider.specialization || provider.expertise || [])
                        .slice(0, 3)
                        .map((service, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-muted text-textSecondary text-xs rounded"
                          >
                            {typeof service === 'string' ? service : String(service)}
                          </span>
                        ))}
                      {((provider.servicesOffered || provider.specialization || provider.expertise || []).length > 3) && (
                        <span className="px-2 py-1 text-textSecondary text-xs">
                          +{((provider.servicesOffered || provider.specialization || provider.expertise || []).length - 3)} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Portfolio Preview */}
                {(provider.portfolioLinks?.length > 0 || provider.portfolio?.length > 0) && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-textSecondary mb-2">Portfolio:</p>
                    <div className="flex gap-2">
                      {(provider.portfolioLinks || provider.portfolio || [])
                        .slice(0, 3)
                        .map((img, idx) => (
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

