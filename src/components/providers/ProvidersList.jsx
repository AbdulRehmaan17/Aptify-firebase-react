import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Building2, Wrench, Star, MapPin, Filter, Search, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

/**
 * ProvidersList - Reusable component for displaying providers
 * @param {string} type - "construction" or "renovation"
 * @param {string} title - Page title
 * @param {string} description - Page description
 */
const ProvidersList = ({ type, title, description }) => {
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

  // Validate type prop
  const providerType = type === 'construction' ? 'construction' : 'renovation';
  const collectionName = providerType === 'construction' ? 'constructionProviders' : 'renovators';
  const Icon = providerType === 'construction' ? Building2 : Wrench;
  const providerLabel = providerType === 'construction' ? 'Constructor' : 'Renovator';

  // Get unique cities and services for filters
  const cities = [...new Set(providers.map((p) => p.location || p.city).filter(Boolean))].sort();
  const services = [
    ...new Set(
      providers
        .flatMap((p) => {
          if (Array.isArray(p.servicesOffered)) return p.servicesOffered;
          if (Array.isArray(p.specialization)) return p.specialization;
          if (Array.isArray(p.expertise)) return p.expertise;
          return [p.servicesOffered || p.specialization || p.expertise].filter(Boolean);
        })
        .filter(Boolean)
        .map(s => typeof s === 'string' ? s : String(s))
    ),
  ].sort();

  useEffect(() => {
    if (!db) {
      console.warn('Firestore db is not initialized');
      setProviders([]);
      setFilteredProviders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // DIAGNOSTIC: First check if any documents exist in the collection
    getDocs(collection(db, collectionName))
      .then((allSnapshot) => {
        console.log(`🔍 DEBUG [${providerType}]: Total documents in ${collectionName}:`, allSnapshot.size);
        if (allSnapshot.size > 0) {
          console.log(`🔍 DEBUG [${providerType}]: Sample documents (first 3):`);
          allSnapshot.docs.slice(0, 3).forEach((docSnap) => {
            const data = docSnap.data();
            console.log(`  - ID: ${docSnap.id}`, {
              approved: data.approved,
              isActive: data.isActive,
              name: data.name || data.fullName,
              companyName: data.companyName,
              city: data.city,
              experience: data.experience,
            });
          });
        } else {
          console.warn(`⚠️ WARNING [${providerType}]: No documents found in ${collectionName} collection`);
        }
      })
      .catch((diagError) => {
        console.warn(`🔍 DEBUG [${providerType}]: Error checking collection:`, diagError);
      });

    // CRITICAL: Query the correct collection based on type
    // TEMPORARY FIX: Show ALL registered providers (approved or pending) for now
    // Filter ONLY by isActive === true (show both approved and pending)
    // DO NOT filter by providerType, serviceType, role, or category (these fields don't exist)
    console.log(`🔍 DEBUG [${providerType}]: Setting up query for ${collectionName}`);
    console.log(`🔍 DEBUG [${providerType}]: Query filter: isActive === true (showing all registered providers)`);
    
    // TEMPORARY DEBUG: Query ALL documents to see what's in the collection
    // This will help diagnose if the issue is with the filter or the data
    console.log(`🔍 DEBUG [${providerType}]: Fetching ALL documents from ${collectionName} (no filters)`);
    
    // First, try to get ALL documents to see what we have
    getDocs(collection(db, collectionName))
      .then((allSnapshot) => {
        console.log(`🔍 DEBUG [${providerType}]: ALL documents in ${collectionName}:`, allSnapshot.size);
        if (allSnapshot.size > 0) {
          console.log(`🔍 DEBUG [${providerType}]: Sample documents:`);
          allSnapshot.docs.slice(0, 3).forEach((docSnap) => {
            const data = docSnap.data();
            console.log(`  - ID: ${docSnap.id}`, {
              name: data.name || data.fullName,
              isActive: data.isActive,
              isActiveType: typeof data.isActive,
              approved: data.approved,
              userId: data.userId,
            });
          });
        }
      })
      .catch((diagError) => {
        console.error(`❌ ERROR [${providerType}]: Error fetching all documents:`, diagError);
      });
    
    // TEMPORARY FIX: Fetch ALL documents first to verify data exists
    // Then filter client-side to ensure we see all registered providers
    console.log(`🔍 DEBUG [${providerType}]: Fetching ALL documents from ${collectionName} (temporary - no filters)`);
    
    getDocs(collection(db, collectionName))
      .then((allSnapshot) => {
        console.log(`✅ DEBUG [${providerType}]: Total documents fetched:`, allSnapshot.size);
        
        if (allSnapshot.size === 0) {
          console.error(`❌ ERROR [${providerType}]: Collection ${collectionName} is EMPTY - no documents found!`);
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
          return;
        }
        
        const allProviders = allSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Normalize location
          if (data.location && typeof data.location === 'object') {
            data.location = data.location.city
              ? `${data.location.city}${data.location.state ? ', ' + data.location.state : ''}`
              : (data.location.city || data.location.state || JSON.stringify(data.location));
          }
          // Normalize isActive (handle string "true")
          if (data.isActive === 'true' || data.isActive === true) {
            data.isActive = true;
          }
          return {
            id: doc.id,
            ...data,
          };
        });
        
        // Filter to only active providers
        const activeProviders = allProviders.filter(p => p.isActive === true || p.isActive === 'true');
        
        console.log(`✅ DEBUG [${providerType}]: Total: ${allProviders.length}, Active: ${activeProviders.length}`);
        console.log(`✅ DEBUG [${providerType}]: Active providers:`, activeProviders);
        
        if (activeProviders.length > 0) {
          // Sort by createdAt if available
          activeProviders.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return bTime - aTime;
          });
        }
        
        setProviders(activeProviders);
        setFilteredProviders(activeProviders);
        setLoading(false);
        console.log(`✅ DEBUG [${providerType}]: State updated - providers: ${activeProviders.length}`);
      })
      .catch((error) => {
        console.error(`❌ ERROR [${providerType}]: Error fetching all documents:`, error);
        setProviders([]);
        setFilteredProviders([]);
        setLoading(false);
      });
    
    // Also set up real-time listener for future updates
    let providersQuery;
    try {
      providersQuery = query(
        collection(db, collectionName),
        where('isActive', '==', true)
      );
    } catch (queryError) {
      console.warn(`⚠️ WARNING [${providerType}]: Query failed:`, queryError);
      return; // Already handled above
    }

    console.log(`✅ Setting up real-time listener for ${collectionName}`);

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      providersQuery,
      (snapshot) => {
        console.log(`✅ SUCCESS [${providerType}]: Query snapshot size:`, snapshot.size);
        console.log(`✅ SUCCESS [${providerType}]: Raw documents fetched:`, snapshot.docs.length);

        const providersList = snapshot.docs.map((doc) => {
          const data = doc.data();
          // CRITICAL: Normalize location to string if it's an object
          if (data.location && typeof data.location === 'object') {
            data.location = data.location.city
              ? `${data.location.city}${data.location.state ? ', ' + data.location.state : ''}`
              : (data.location.city || data.location.state || JSON.stringify(data.location));
          }
          // CRITICAL: Normalize isActive to boolean (handle string "true"/"false")
          if (data.isActive === 'true' || data.isActive === true) {
            data.isActive = true;
          } else if (data.isActive === 'false' || data.isActive === false) {
            data.isActive = false;
          }
          return {
            id: doc.id,
            ...data,
          };
        });

        console.log(`✅ SUCCESS [${providerType}]: Providers mapped:`, providersList.length, 'providers');
        console.log(`✅ DEBUG [${providerType}]: Setting providers state with ${providersList.length} items`);
        console.log(`✅ DEBUG [${providerType}]: Full providers list:`, providersList);
        
        if (providersList.length > 0) {
          console.log(`✅ SUCCESS [${providerType}]: First provider sample:`, {
            id: providersList[0].id,
            name: providersList[0].name,
            companyName: providersList[0].companyName,
            city: providersList[0].city,
            approved: providersList[0].approved,
            isActive: providersList[0].isActive,
            experience: providersList[0].experience,
          });
        } else {
          console.warn(`⚠️ WARNING [${providerType}]: Query returned 0 providers. Check if ${providerLabel}s have isActive=true`);
          console.warn(`⚠️ DEBUG [${providerType}]: Attempting fallback query without filters to diagnose...`);
          
          // FALLBACK: Try fetching ALL documents to see what's actually in the collection
          getDocs(collection(db, collectionName))
            .then((allSnapshot) => {
              console.log(`🔍 DIAGNOSTIC [${providerType}]: Total documents in ${collectionName}:`, allSnapshot.size);
              if (allSnapshot.size > 0) {
                console.log(`🔍 DIAGNOSTIC [${providerType}]: All documents (first 5):`);
                allSnapshot.docs.slice(0, 5).forEach((docSnap) => {
                  const data = docSnap.data();
                  console.log(`  - ID: ${docSnap.id}`, {
                    approved: data.approved,
                    isActive: data.isActive,
                    name: data.name || data.fullName,
                    companyName: data.companyName,
                    userId: data.userId,
                    hasApprovedField: 'approved' in data,
                    hasIsActiveField: 'isActive' in data,
                  });
                });
                
                // Count how many are active
                const activeCount = allSnapshot.docs.filter(d => d.data().isActive === true).length;
                const approvedCount = allSnapshot.docs.filter(d => d.data().approved === true).length;
                
                console.log(`🔍 DIAGNOSTIC [${providerType}]: Breakdown:`, {
                  total: allSnapshot.size,
                  active: activeCount,
                  approved: approvedCount,
                });
                
                if (activeCount === 0 && allSnapshot.size > 0) {
                  console.error(`❌ CRITICAL [${providerType}]: Found ${allSnapshot.size} documents but NONE have isActive=true`);
                  console.error(`❌ Check if ${providerLabel}s are being saved with isActive=true during registration`);
                } else if (activeCount > 0) {
                  console.log(`✅ DIAGNOSTIC [${providerType}]: Found ${activeCount} active ${providerLabel}s (${approvedCount} approved, ${activeCount - approvedCount} pending)`);
                }
              } else {
                console.warn(`⚠️ DIAGNOSTIC [${providerType}]: Collection ${collectionName} is completely empty`);
              }
            })
            .catch((diagError) => {
              console.error(`❌ DIAGNOSTIC ERROR [${providerType}]:`, diagError);
            });
        }

        console.log(`✅ DEBUG [${providerType}]: About to set state - providersList length:`, providersList.length);
        setProviders(providersList);
        setFilteredProviders(providersList);
        console.log(`✅ DEBUG [${providerType}]: State set - providers: ${providersList.length}, filteredProviders: ${providersList.length}`);
        setLoading(false);
        console.log(`✅ DEBUG [${providerType}]: Loading set to false`);
      },
      (error) => {
        console.error(`❌ ERROR [${providerType}]: Error fetching ${collectionName}:`, error);
        // Handle permission errors gracefully
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Please check Firestore rules.');
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
        } else if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          // Fallback: query without orderBy if index is missing
          console.warn(`⚠️ WARNING [${providerType}]: Index required for query. Falling back to query without orderBy.`);
          // FALLBACK: Query without orderBy, still show all active providers
          const fallbackQuery = query(
            collection(db, collectionName),
            where('isActive', '==', true)
          );
          getDocs(fallbackQuery)
            .then((snapshot) => {
              console.log(`✅ SUCCESS [${providerType}] (Fallback): Snapshot size:`, snapshot.size);
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
                };
              });
              // Sort by createdAt manually if available
              providersList.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return bTime - aTime;
              });
              console.log(`✅ SUCCESS [${providerType}] (Fallback): Providers fetched:`, providersList.length, 'providers');
              if (providersList.length > 0) {
                console.log(`✅ SUCCESS [${providerType}] (Fallback): First provider sample:`, providersList[0]);
              }
              setProviders(providersList);
              setFilteredProviders(providersList);
              setLoading(false);
            })
            .catch((fallbackError) => {
              console.error(`❌ ERROR [${providerType}]: Fallback query failed:`, fallbackError);
              // Last resort: try fetching all documents and filtering client-side
              console.warn(`⚠️ WARNING [${providerType}]: Trying to fetch all ${collectionName} documents...`);
              getDocs(collection(db, collectionName))
                .then((allSnapshot) => {
                  console.log(`🔍 DEBUG [${providerType}]: All ${collectionName} - Snapshot size:`, allSnapshot.size);
                  const allProviders = allSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  // Filter active providers client-side (show all registered, approved or pending)
                  // CRITICAL: Only filter by isActive (no providerType/serviceType)
                  const filtered = allProviders.filter(p =>
                    p.isActive === true
                  );
                  console.log(`✅ SUCCESS [${providerType}] (Client-side filter): Providers:`, filtered.length, 'providers');
                  if (filtered.length > 0) {
                    console.log(`✅ SUCCESS [${providerType}]: Sample filtered provider:`, {
                      id: filtered[0].id,
                      name: filtered[0].name,
                      approved: filtered[0].approved,
                      isActive: filtered[0].isActive,
                    });
                  } else {
                    console.warn(`⚠️ WARNING [${providerType}]: Client-side filter returned 0 providers`);
                    console.warn(`⚠️ Check if ${providerLabel}s have approved=true AND isActive=true`);
                  }
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
                  console.error(`❌ ERROR [${providerType}]: Final fallback query failed:`, finalError);
                  toast.error(`Failed to load ${providerLabel.toLowerCase()} providers`);
                  setProviders([]);
                  setFilteredProviders([]);
                  setLoading(false);
                });
            });
        } else {
          toast.error(`Failed to load ${providerLabel.toLowerCase()} providers`);
          setProviders([]);
          setFilteredProviders([]);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [providerType, collectionName, providerLabel]);

  // Apply filters and search
  useEffect(() => {
    console.log(`🔍 DEBUG [${providerType}]: Filtering providers - Total:`, providers.length);
    console.log(`🔍 DEBUG [${providerType}]: Active filters:`, { city: filters.city, specialization: filters.specialization, searchTerm });
    
    let filtered = [...providers];

    // Apply location filter
    if (filters.city) {
      const beforeCount = filtered.length;
      filtered = filtered.filter((p) => {
        const location = (p.location || p.city || '').toLowerCase();
        return location === filters.city.toLowerCase();
      });
      console.log(`🔍 DEBUG [${providerType}]: After city filter (${filters.city}): ${filtered.length} of ${beforeCount}`);
    }

    // Apply specialization filter
    if (filters.specialization) {
      const beforeCount = filtered.length;
      filtered = filtered.filter((p) => {
        const services = Array.isArray(p.servicesOffered)
          ? p.servicesOffered
          : Array.isArray(p.specialization)
            ? p.specialization
            : Array.isArray(p.expertise)
              ? p.expertise
              : [p.servicesOffered || p.specialization || p.expertise].filter(Boolean);
        return services.some((service) =>
          String(service)?.toLowerCase().includes(filters.specialization.toLowerCase())
        );
      });
      console.log(`🔍 DEBUG [${providerType}]: After specialization filter (${filters.specialization}): ${filtered.length} of ${beforeCount}`);
    }

    // Apply search term
    if (searchTerm.trim()) {
      const beforeCount = filtered.length;
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const name = p.name || p.fullName || '';
        const location = p.location || p.city || '';
        const companyName = p.companyName || '';
        const nameMatch = name.toLowerCase().includes(term);
        const cityMatch = location.toLowerCase().includes(term);
        const companyMatch = companyName.toLowerCase().includes(term);
        const services = Array.isArray(p.servicesOffered)
          ? p.servicesOffered
          : Array.isArray(p.specialization)
            ? p.specialization
            : Array.isArray(p.expertise)
              ? p.expertise
              : [];
        const serviceMatch = services.some((s) => String(s).toLowerCase().includes(term));
        return nameMatch || cityMatch || companyMatch || serviceMatch;
      });
      console.log(`🔍 DEBUG [${providerType}]: After search filter (${searchTerm}): ${filtered.length} of ${beforeCount}`);
    }

    console.log(`✅ FINAL [${providerType}]: Filtered providers count:`, filtered.length, 'of', providers.length);
    console.log(`✅ DEBUG [${providerType}]: Filtered providers array:`, filtered);
    if (filtered.length === 0 && providers.length > 0) {
      console.warn(`⚠️ WARNING [${providerType}]: All ${providers.length} providers were filtered out!`);
      console.warn(`⚠️ DEBUG [${providerType}]: Active filters:`, { city: filters.city, specialization: filters.specialization, searchTerm });
      console.warn(`⚠️ DEBUG [${providerType}]: First provider data:`, providers[0]);
    }
    setFilteredProviders(filtered);
  }, [providers, filters, searchTerm, providerType]);

  const handleRequestService = (providerId) => {
    if (!user) {
      toast.error(`Please log in to request ${providerType} service`);
      navigate('/auth');
      return;
    }
    if (providerType === 'construction') {
      navigate(`/request-construction?providerId=${providerId}`);
    } else {
      navigate(`/request-renovation?providerId=${providerId}`);
    }
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
            {title || `${providerLabel} Providers`}
          </h1>
          <p className="text-lg text-textSecondary">
            {description || `Browse verified ${providerLabel.toLowerCase()} professionals for your project`}
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
                Filter by Location
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface"
              >
                <option value="">All Locations</option>
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
                Filter by Service
              </label>
              <select
                value={filters.specialization}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, specialization: e.target.value }))
                }
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface"
              >
                <option value="">All Services</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
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
        {/* CRITICAL: Always render providers when array has data - no conditional blocking */}
        {providers.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Icon className="w-16 h-16 mx-auto text-muted mb-4" />
            <h3 className="text-xl font-semibold text-textMain mb-2">No Providers Found</h3>
            <p className="text-textSecondary mb-6">
              No approved {providerLabel.toLowerCase()} providers available yet.
            </p>
            {user && (
              <Button onClick={() => navigate(providerType === 'construction' ? '/register-constructor' : '/register-renovator')}>
                Become a Provider
              </Button>
            )}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="card-base p-12 text-center">
            <Icon className="w-16 h-16 mx-auto text-muted mb-4" />
            <h3 className="text-xl font-semibold text-textMain mb-2">No Providers Match Your Filters</h3>
            <p className="text-textSecondary mb-6">
              Try adjusting your filters or search criteria. ({providers.length} providers available)
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ city: '', specialization: '' });
                setSearchTerm('');
              }}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => {
              console.log(`🔍 RENDERING [${providerType}]: Provider ${provider.id} - ${provider.name}`);
              return (
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
                      <Icon className="w-16 h-16 text-muted" />
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
                  <h3 className="text-xl font-semibold text-textMain mb-2">
                    {provider.name || provider.fullName || `${providerLabel} Provider`}
                  </h3>
                  <p className="font-semibold text-textMain mb-1">
                    {provider.companyName || 'Independent Provider'}
                  </p>

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

                  {/* Location */}
                  <div className="flex items-center text-textSecondary mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <p className="text-sm">
                      {typeof provider.location === 'string'
                        ? provider.location
                        : provider.city || 'Location not provided'}
                    </p>
                  </div>
                  {provider.officeAddress && (
                    <p className="text-sm text-textSecondary mb-3">{provider.officeAddress}</p>
                  )}

                  {/* Services Offered */}
                  <div className="mb-4">
                    <p className="text-xs text-textSecondary mb-1">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(provider.servicesOffered)
                        ? provider.servicesOffered
                        : Array.isArray(provider.specialization)
                          ? provider.specialization
                          : Array.isArray(provider.expertise)
                            ? provider.expertise
                            : [provider.servicesOffered || provider.specialization || provider.expertise].filter(Boolean)
                      )
                        .slice(0, 3)
                        .map((spec, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-base"
                          >
                            {typeof spec === 'string' ? spec : JSON.stringify(spec)}
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
                      className="flex-1 !bg-primary !text-white hover:!bg-primaryDark border-2 border-primary hover:border-primaryDark shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                      onClick={() => handleRequestService(provider.userId || provider.id)}
                    >
                      Request Service
                    </Button>
                    <Link to={providerType === 'construction' 
                      ? `/construction-provider/${provider.userId || provider.id}`
                      : `/renovation-provider/${provider.userId || provider.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvidersList;

