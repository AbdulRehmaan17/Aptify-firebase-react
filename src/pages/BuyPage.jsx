import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Home, MapPin, DollarSign, Filter, Search } from 'lucide-react';
import marketplaceService from '../services/marketplaceService';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * BuyPage Component
 *
 * Dedicated page for properties for sale.
 * Displays properties filtered by type: 'sale'
 */
const BuyPage = () => {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    city: searchParams.get('city') || '',
  });
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'clothing', label: 'Clothing & Accessories' },
    { value: 'books', label: 'Books & Media' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'sports', label: 'Sports & Outdoors' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);

        const firestoreFilters = {
          status: 'active',
        };

        if (filters.category) {
          firestoreFilters.category = filters.category;
        }

        if (filters.minPrice) {
          firestoreFilters.minPrice = Number(filters.minPrice);
        }

        if (filters.maxPrice) {
          firestoreFilters.maxPrice = Number(filters.maxPrice);
        }

        if (filters.city) {
          firestoreFilters.city = filters.city;
        }

        const sortOptions = {
          sortBy: sortBy === 'price-low' || sortBy === 'price-high' ? 'price' : 'createdAt',
          sortOrder: sortBy === 'price-low' ? 'asc' : 'desc',
        };

        let listingsData = await marketplaceService.getAll(firestoreFilters, sortOptions);

        // Client-side search filter
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          listingsData = listingsData.filter(
            (listing) =>
              listing.title?.toLowerCase().includes(query) ||
              listing.description?.toLowerCase().includes(query) ||
              listing.location?.toLowerCase().includes(query) ||
              listing.city?.toLowerCase().includes(query)
          );
        }

        setListings(listingsData || []);
      } catch (error) {
        console.error('Error fetching marketplace listings:', error);
        toast.error(`Failed to load listings: ${error.message || 'Unknown error'}`);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [filters, sortBy, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Home className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-4xl font-display font-bold text-textMain">Marketplace</h1>
          </div>
          <p className="text-lg text-textSecondary">
            Buy and sell items in our marketplace
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 bg-surface rounded-base shadow-md p-4 border border-muted">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by title, description, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="pt-4 border-t border-muted grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
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

        {/* Listings Grid */}
        {listings.length > 0 ? (
          <>
            <div className="mb-4 text-textSecondary">
              Found {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/marketplace/${listing.id}`}
                  className="block"
                >
                  <div className="bg-surface rounded-base shadow-md overflow-hidden border border-muted hover:shadow-lg transition-shadow">
                    <div className="relative h-48 w-full">
                      <img
                        src={listing.coverImage || listing.images?.[0] || 'https://via.placeholder.com/400x250?text=No+Image'}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/90 text-white">
                          {listing.category}
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
                          {listing.city || listing.location}
                        </span>
                      </p>
                      <p className="text-primary font-bold text-xl mb-2">
                        {new Intl.NumberFormat('en-PK', {
                          style: 'currency',
                          currency: 'PKR',
                          maximumFractionDigits: 0,
                        }).format(listing.price)}
                      </p>
                      <p className="text-xs text-textSecondary capitalize">
                        Condition: {listing.condition}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-surface rounded-lg shadow-lg">
            <Home className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h3 className="text-2xl font-semibold text-textMain mb-2">
              No Listings Found
            </h3>
            <p className="text-textSecondary mb-6">
              {searchTerm || Object.values(filters).some((f) => f)
                ? 'Try adjusting your search or filters'
                : 'Check back soon for new listings'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/sell">List Your Item</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyPage;
