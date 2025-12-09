import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Search,
  Filter,
  Home,
  Building2,
  Wrench,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Star,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { GridSkeleton, PropertyCardSkeleton, ProviderCardSkeleton } from '../common/SkeletonLoader';
import { EmptySearch } from '../common/EmptyState';
import toast from 'react-hot-toast';

const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'rentals', 'buy-sell', 'providers'

  // Data states
  const [rentalListings, setRentalListings] = useState([]);
  const [buySellListings, setBuySellListings] = useState([]);
  const [providers, setProviders] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    city: '',
    category: 'all',
    serviceType: 'all', // For providers: 'all', 'Construction', 'Renovation'
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'townhouse', label: 'Townhouse' },
  ];

  // Load all data on mount
  useEffect(() => {
    if (!db) return;

    loadRentalListings();
    loadBuySellListings();
    loadProviders();
  }, []);

  // Load rental listings
  const loadRentalListings = () => {
    if (!db) return;

    try {
      const rentalsQuery = query(collection(db, 'properties'), where('status', '==', 'published'));

      const unsubscribe = onSnapshot(
        rentalsQuery,
        (snapshot) => {
          const listings = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (listing) =>
                (listing.type === 'rent' || listing.listingType === 'rent') &&
                listing.status === 'published'
            );
          setRentalListings(listings);
        },
        (error) => {
          console.error('Error loading rental listings:', error);
          // Fallback: fetch all and filter client-side
          const fallbackQuery = query(collection(db, 'properties'));
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const listings = fallbackSnapshot.docs
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
                .filter(
                  (listing) =>
                    (listing.type === 'rent' || listing.listingType === 'rent') &&
                    listing.status === 'published'
                );
              setRentalListings(listings);
            },
            (fallbackError) => {
              console.error('Error loading rental listings (fallback):', fallbackError);
            }
          );
          return () => fallbackUnsubscribe();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up rental listings listener:', error);
    }
  };

  // Load buy/sell listings
  const loadBuySellListings = () => {
    if (!db) return;

    try {
      const buySellQuery = query(collection(db, 'properties'), where('status', '==', 'published'));

      const unsubscribe = onSnapshot(
        buySellQuery,
        (snapshot) => {
          const listings = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (listing) =>
                (listing.type === 'sale' ||
                  listing.type === 'buy' ||
                  listing.type === 'sell' ||
                  listing.listingType === 'sell' ||
                  listing.listingType === 'buy') &&
                listing.status === 'published'
            );
          setBuySellListings(listings);
        },
        (error) => {
          console.error('Error loading buy/sell listings:', error);
          // Fallback: fetch all and filter client-side
          const fallbackQuery = query(collection(db, 'properties'));
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const listings = fallbackSnapshot.docs
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
                .filter(
                  (listing) =>
                    (listing.type === 'sale' ||
                      listing.type === 'buy' ||
                      listing.type === 'sell' ||
                      listing.listingType === 'sell' ||
                      listing.listingType === 'buy') &&
                    listing.status === 'published'
                );
              setBuySellListings(listings);
            },
            (fallbackError) => {
              console.error('Error loading buy/sell listings (fallback):', fallbackError);
            }
          );
          return () => fallbackUnsubscribe();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up buy/sell listings listener:', error);
    }
  };

  // Load providers
  const loadProviders = () => {
    if (!db) return;

    try {
      const providersQuery = query(
        collection(db, 'serviceProviders'),
        where('isApproved', '==', true)
      );

      const unsubscribe = onSnapshot(
        providersQuery,
        (snapshot) => {
          const providersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProviders(providersList);
        },
        (error) => {
          console.error('Error loading providers:', error);
          // Fallback: fetch all and filter client-side
          const fallbackQuery = query(collection(db, 'serviceProviders'));
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const providersList = fallbackSnapshot.docs
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
                .filter((provider) => provider.isApproved || provider.approved);
              setProviders(providersList);
            },
            (fallbackError) => {
              console.error('Error loading providers (fallback):', fallbackError);
            }
          );
          return () => fallbackUnsubscribe();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up providers listener:', error);
    }
  };

  // Filter and search logic
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results = {
      rentals: [],
      buySell: [],
      providers: [],
    };

    // Filter rental listings
    let filteredRentals = [...rentalListings];

    // Text search
    if (query) {
      filteredRentals = filteredRentals.filter(
        (listing) =>
          listing.title?.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query) ||
          listing.address?.city?.toLowerCase().includes(query) ||
          listing.address?.line1?.toLowerCase().includes(query)
      );
    }

    // Price filter
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filteredRentals = filteredRentals.filter((listing) => (listing.price || 0) >= minPrice);
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filteredRentals = filteredRentals.filter((listing) => (listing.price || 0) <= maxPrice);
    }

    // City filter
    if (filters.city.trim()) {
      const city = filters.city.toLowerCase();
      filteredRentals = filteredRentals.filter(
        (listing) =>
          listing.address?.city?.toLowerCase().includes(city) ||
          listing.city?.toLowerCase().includes(city)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filteredRentals = filteredRentals.filter((listing) => listing.category === filters.category);
    }

    results.rentals = filteredRentals;

    // Filter buy/sell listings
    let filteredBuySell = [...buySellListings];

    // Text search
    if (query) {
      filteredBuySell = filteredBuySell.filter(
        (listing) =>
          listing.title?.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query) ||
          listing.address?.city?.toLowerCase().includes(query) ||
          listing.address?.line1?.toLowerCase().includes(query)
      );
    }

    // Price filter
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filteredBuySell = filteredBuySell.filter((listing) => (listing.price || 0) >= minPrice);
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filteredBuySell = filteredBuySell.filter((listing) => (listing.price || 0) <= maxPrice);
    }

    // City filter
    if (filters.city.trim()) {
      const city = filters.city.toLowerCase();
      filteredBuySell = filteredBuySell.filter(
        (listing) =>
          listing.address?.city?.toLowerCase().includes(city) ||
          listing.city?.toLowerCase().includes(city)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filteredBuySell = filteredBuySell.filter((listing) => listing.category === filters.category);
    }

    results.buySell = filteredBuySell;

    // Filter providers
    let filteredProviders = [...providers];

    // Text search
    if (query) {
      filteredProviders = filteredProviders.filter(
        (provider) =>
          provider.name?.toLowerCase().includes(query) ||
          provider.bio?.toLowerCase().includes(query) ||
          provider.city?.toLowerCase().includes(query) ||
          (Array.isArray(provider.expertise) &&
            provider.expertise.some((exp) => exp.toLowerCase().includes(query))) ||
          (Array.isArray(provider.specialization) &&
            provider.specialization.some((spec) => spec.toLowerCase().includes(query)))
      );
    }

    // Service type filter
    if (filters.serviceType !== 'all') {
      filteredProviders = filteredProviders.filter(
        (provider) => provider.serviceType === filters.serviceType
      );
    }

    // City filter
    if (filters.city.trim()) {
      const city = filters.city.toLowerCase();
      filteredProviders = filteredProviders.filter((provider) =>
        provider.city?.toLowerCase().includes(city)
      );
    }

    results.providers = filteredProviders;

    return results;
  }, [searchQuery, filters, rentalListings, buySellListings, providers]);

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      city: '',
      category: 'all',
      serviceType: 'all',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = () => {
    return (
      filters.minPrice ||
      filters.maxPrice ||
      filters.city.trim() ||
      filters.category !== 'all' ||
      filters.serviceType !== 'all' ||
      searchQuery.trim()
    );
  };

  const totalResults =
    filteredResults.rentals.length +
    filteredResults.buySell.length +
    filteredResults.providers.length;

  const getDisplayResults = () => {
    switch (activeTab) {
      case 'rentals':
        return { rentals: filteredResults.rentals, buySell: [], providers: [] };
      case 'buy-sell':
        return { rentals: [], buySell: filteredResults.buySell, providers: [] };
      case 'providers':
        return { rentals: [], buySell: [], providers: filteredResults.providers };
      default:
        return filteredResults;
    }
  };

  const displayResults = getDisplayResults();

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-textMain mb-2">Global Search</h1>
          <p className="text-textSecondary">
            Search across rentals, buy/sell listings, and service providers
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-surface rounded-base shadow-md p-4 border border-muted mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
              <input
                type="text"
                placeholder="Search rentals, properties, or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="flex items-center text-textSecondary"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-muted grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Min Price (PKR)
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Max Price (PKR)
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Any"
                  min="0"
                  className="w-full px-3 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">City</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="Any city"
                  className="w-full px-3 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Service Type
                </label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-muted rounded-base bg-surface focus:border-primary focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Services</option>
                  <option value="Construction">Construction</option>
                  <option value="Renovation">Renovation</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-textSecondary">
            {activeTab === 'all' && (
              <span>
                Found {totalResults} results ({filteredResults.rentals.length} rentals,{' '}
                {filteredResults.buySell.length} buy/sell, {filteredResults.providers.length}{' '}
                providers)
              </span>
            )}
            {activeTab === 'rentals' && (
              <span>Found {displayResults.rentals.length} rental listings</span>
            )}
            {activeTab === 'buy-sell' && (
              <span>Found {displayResults.buySell.length} buy/sell listings</span>
            )}
            {activeTab === 'providers' && (
              <span>Found {displayResults.providers.length} service providers</span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition ${
                activeTab === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('rentals')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition ${
                activeTab === 'rentals'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Rentals ({filteredResults.rentals.length})
            </button>
            <button
              onClick={() => setActiveTab('buy-sell')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition ${
                activeTab === 'buy-sell'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Buy/Sell ({filteredResults.buySell.length})
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={`px-4 py-2 rounded-base text-sm font-medium transition ${
                activeTab === 'providers'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-textSecondary hover:bg-muted'
              }`}
            >
              Providers ({filteredResults.providers.length})
            </button>
          </div>
        </div>

        {/* Results */}
        {(activeTab === 'all' || activeTab === 'rentals') && displayResults.rentals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-textMain mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-primary" />
              Rental Listings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayResults.rentals.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/rental/${listing.id}`}
                  className="block bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48 w-full">
                    <img
                      src={
                        listing.coverImage ||
                        listing.photos?.[0] ||
                        'https://via.placeholder.com/400x250?text=No+Image'
                      }
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                        For Rent
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-textMain mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-textSecondary flex items-center mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="line-clamp-1">
                        {listing.address?.city || listing.city},{' '}
                        {listing.address?.line1 || listing.location}
                      </span>
                    </p>
                    <p className="text-primary font-bold text-xl mb-3">
                      {formatPrice(listing.price)}/month
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-textSecondary">
                      {listing.bedrooms > 0 && (
                        <span className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {listing.bedrooms}
                        </span>
                      )}
                      {listing.bathrooms > 0 && (
                        <span className="flex items-center">
                          <Bath className="w-4 h-4 mr-1" />
                          {listing.bathrooms}
                        </span>
                      )}
                      {listing.areaSqFt > 0 && (
                        <span className="flex items-center">
                          <Square className="w-4 h-4 mr-1" />
                          {listing.areaSqFt} sq ft
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'buy-sell') && displayResults.buySell.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-textMain mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-primary" />
              Buy/Sell Listings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayResults.buySell.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/buy-sell/listing/${listing.id}`}
                  className="block bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48 w-full">
                    <img
                      src={
                        listing.coverImage ||
                        listing.photos?.[0] ||
                        'https://via.placeholder.com/400x250?text=No+Image'
                      }
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          (listing.listingType || listing.type) === 'sell'
                            ? 'bg-accent text-white'
                            : 'bg-primary text-white'
                        }`}
                      >
                        {(listing.listingType || listing.type) === 'sell'
                          ? 'For Sale'
                          : 'Want to Buy'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-textMain mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-textSecondary flex items-center mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="line-clamp-1">
                        {listing.address?.city || listing.city},{' '}
                        {listing.address?.line1 || listing.location}
                      </span>
                    </p>
                    <p className="text-primary font-bold text-xl mb-3">
                      {formatPrice(listing.price)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-textSecondary">
                      {listing.bedrooms > 0 && (
                        <span className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {listing.bedrooms}
                        </span>
                      )}
                      {listing.bathrooms > 0 && (
                        <span className="flex items-center">
                          <Bath className="w-4 h-4 mr-1" />
                          {listing.bathrooms}
                        </span>
                      )}
                      {listing.areaSqFt > 0 && (
                        <span className="flex items-center">
                          <Square className="w-4 h-4 mr-1" />
                          {listing.areaSqFt} sq ft
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'providers') &&
          displayResults.providers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-textMain mb-4 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-primary" />
                Service Providers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayResults.providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-textMain mb-1">
                            {provider.name}
                          </h3>
                          <p className="text-sm text-textSecondary flex items-center">
                            <Wrench className="w-4 h-4 mr-1" />
                            {provider.serviceType}
                          </p>
                        </div>
                        {provider.rating > 0 && (
                          <div className="flex items-center bg-accent/10 px-2 py-1 rounded-base">
                            <Star className="w-4 h-4 text-accent mr-1 fill-current" />
                            <span className="text-sm font-semibold text-textMain">
                              {provider.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {provider.bio && (
                        <p className="text-sm text-textSecondary mb-4 line-clamp-2">
                          {provider.bio}
                        </p>
                      )}

                      {provider.expertise &&
                        Array.isArray(provider.expertise) &&
                        provider.expertise.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-textSecondary mb-2">
                              Expertise:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {provider.expertise.slice(0, 3).map((exp, idx) => (
                                <span
                                  key={idx}
                                  className="bg-muted text-textMain px-2 py-1 rounded-base text-xs"
                                >
                                  {exp}
                                </span>
                              ))}
                              {provider.expertise.length > 3 && (
                                <span className="text-xs text-textSecondary">
                                  +{provider.expertise.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                      <div className="flex items-center text-sm text-textSecondary mb-4">
                        {provider.city && (
                          <span className="flex items-center mr-4">
                            <MapPin className="w-4 h-4 mr-1" />
                            {provider.city}
                          </span>
                        )}
                        {provider.experienceYears > 0 && (
                          <span>{provider.experienceYears} years experience</span>
                        )}
                      </div>

                      <Link to={`/provider/${provider.id}`}>
                        <Button className="w-full">View Profile</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* No Results */}
        {totalResults === 0 && <EmptySearch searchQuery={searchQuery} onClear={clearFilters} />}
      </div>
    </div>
  );
};

export default GlobalSearch;
