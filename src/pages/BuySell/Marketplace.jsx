import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import propertyService from '../../services/propertyService';
import { MapPin, DollarSign, Bed, Bath, Square, Search, Filter, Heart } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PropertyCard from '../../components/property/PropertyCard';
import toast from 'react-hot-toast';

const Marketplace = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    listingType: 'all', // 'all', 'sell', 'buy'
    category: 'all',
    minPrice: '',
    maxPrice: '',
    city: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'townhouse', label: 'Townhouse' },
  ];

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchQuery, filters]);

  const loadListings = () => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query for both 'buy' and 'sell' properties
      const listingsQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        listingsQuery,
        (snapshot) => {
          const listingsList = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (listing) =>
                (listing.type === 'buy' || listing.listingType === 'buy' ||
                 listing.type === 'sell' || listing.listingType === 'sell')
            );
          setListings(listingsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading listings:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'properties'),
              where('status', '==', 'active')
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (fallbackSnapshot) => {
                const listingsList = fallbackSnapshot.docs
                  .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }))
                  .filter(
                    (listing) =>
                      (listing.type === 'buy' || listing.listingType === 'buy' ||
                       listing.type === 'sell' || listing.listingType === 'sell')
                  )
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.() || new Date(0);
                    const bTime = b.createdAt?.toDate?.() || new Date(0);
                    return bTime - aTime;
                  });
                setListings(listingsList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error loading listings (fallback):', fallbackError);
                toast.error('Failed to load listings');
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            toast.error('Failed to load listings');
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listings listener:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.title?.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query) ||
          listing.address?.line1?.toLowerCase().includes(query) ||
          listing.address?.city?.toLowerCase().includes(query)
      );
    }

    // Listing type filter
    if (filters.listingType !== 'all') {
      filtered = filtered.filter(
        (listing) =>
          (listing.listingType || listing.type) === filters.listingType
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((listing) => listing.category === filters.category);
    }

    // Price filters
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filtered = filtered.filter((listing) => listing.price >= minPrice);
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filtered = filtered.filter((listing) => listing.price <= maxPrice);
    }

    // City filter
    if (filters.city.trim()) {
      const city = filters.city.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.address?.city?.toLowerCase().includes(city) ||
          listing.city?.toLowerCase().includes(city)
      );
    }

    setFilteredListings(filtered);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-textMain">Property Marketplace</h1>
            <p className="text-textSecondary mt-2">Browse properties for sale and purchase</p>
          </div>
          {currentUser && (
            <Button onClick={() => navigate('/buy-sell/add')} className="flex items-center">
              <Home className="w-4 h-4 mr-2" />
              Add Listing
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-surface rounded-base shadow-md p-4 border border-muted mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-muted grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Listing Type
                </label>
                <select
                  value={filters.listingType}
                  onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                  className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="sell">For Sale</option>
                  <option value="buy">Want to Buy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Min Price"
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder="0"
                min="0"
              />

              <Input
                label="Max Price"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="Any"
                min="0"
              />

              <Input
                label="City"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="Any city"
              />
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-textSecondary">
          Showing {filteredListings.length} of {listings.length} listings
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="bg-surface rounded-base shadow-md p-12 border border-muted text-center">
            <Home className="w-16 h-16 text-textSecondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-textMain mb-2">No listings found</h2>
            <p className="text-textSecondary mb-6">
              {searchQuery || Object.values(filters).some((f) => f && f !== 'all')
                ? 'Try adjusting your search or filters'
                : 'Be the first to add a listing!'}
            </p>
            {currentUser && (
              <Button onClick={() => navigate('/buy-sell/add')}>Add Listing</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/buy-sell/listing/${listing.id}`}
                className="block"
              >
                <div className="bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow">
                  <div className="relative h-48 w-full">
                    <img
                      src={listing.coverImage || listing.photos?.[0] || 'https://via.placeholder.com/400x250?text=No+Image'}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (listing.listingType || listing.type) === 'sell'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {(listing.listingType || listing.type) === 'sell' ? 'For Sale' : 'Want to Buy'}
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
                        {listing.address?.city || listing.city}, {listing.address?.line1 || listing.location}
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;





