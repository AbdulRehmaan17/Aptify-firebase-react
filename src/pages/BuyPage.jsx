import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Home, MapPin, DollarSign, Filter, X } from 'lucide-react';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

/**
 * BuyPage Component
 *
 * Dedicated page for properties for sale.
 * Displays properties filtered by type: 'sale'
 */
const BuyPage = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    city: '',
    propertyType: '', // e.g., 'house', 'apartment', 'villa', etc.
  });

  const propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'plot', label: 'Plot/Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'townhouse', label: 'Townhouse' },
  ];

  // Initial load - fetch without filters
  useEffect(() => {
    fetchProperties({});
  }, []);

  // Fetch properties from Firestore with filters
  const fetchProperties = async (appliedFilters = {}) => {
    try {
      setLoading(true);

      // Build Firestore filters object
      const firestoreFilters = {
        type: 'sale',
        status: 'published',
        ...appliedFilters,
      };

      // Add price filters if provided
      if (appliedFilters.minPrice && appliedFilters.minPrice !== '') {
        firestoreFilters.minPrice = Number(appliedFilters.minPrice);
      }
      if (appliedFilters.maxPrice && appliedFilters.maxPrice !== '') {
        firestoreFilters.maxPrice = Number(appliedFilters.maxPrice);
      }

      // Add city filter if provided
      if (appliedFilters.city && appliedFilters.city.trim() !== '') {
        firestoreFilters.city = appliedFilters.city.trim();
      }

      // Add property type filter if provided (category field)
      if (appliedFilters.propertyType && appliedFilters.propertyType !== '') {
        firestoreFilters.category = appliedFilters.propertyType;
      }

      const sortOptions = { sortBy: 'createdAt', sortOrder: 'desc' };

      let propertiesData;
      if (searchTerm.trim()) {
        propertiesData = await propertyService.search(searchTerm, firestoreFilters);
      } else {
        propertiesData = await propertyService.getAll(firestoreFilters, sortOptions);
      }

      setProperties(propertiesData || []);
    } catch (error) {
      console.error('Error fetching sale properties:', error);
      toast.error(`Failed to load properties for sale: ${error.message || 'Unknown error'}`);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Apply Filters button click
  const handleApplyFilters = () => {
    fetchProperties(filters);
    setShowFilters(false);
  };

  // Handle Clear Filters
  const handleClearFilters = () => {
    const emptyFilters = {
      minPrice: '',
      maxPrice: '',
      city: '',
      propertyType: '',
    };
    setFilters(emptyFilters);
    fetchProperties(emptyFilters);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProperties(filters);
  };

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
            <h1 className="text-4xl font-display font-bold text-textMain">Properties for Sale</h1>
          </div>
          <p className="text-lg text-textSecondary">
            Discover your dream property from our exclusive listings
          </p>
        </div>

        {/* Search Bar and Filters */}
        <div className="mb-8 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <input
              type="text"
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by location, city, or address..."
              className="flex-1 px-4 py-3 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </form>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-surface border border-muted rounded-base p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-textMain">Filter Properties</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-textSecondary hover:text-textMain"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Property Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Property Type
                  </label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                    className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Min Price
                  </label>
                  <Input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full"
                  />
                </div>

                {/* Max Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">
                    Max Price
                  </label>
                  <Input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    placeholder="Any"
                    min="0"
                    className="w-full"
                  />
                </div>

                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-2">City</label>
                  <Input
                    type="text"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    placeholder="Any city"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex gap-4 mt-6">
                <Button onClick={handleApplyFilters} variant="primary" className="flex-1">
                  Apply Filters
                </Button>
                <Button onClick={handleClearFilters} variant="outline" className="flex-1">
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <>
            <div className="mb-4 text-textSecondary">
              Found {properties.length} {properties.length === 1 ? 'property' : 'properties'} for
              sale
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-surface rounded-lg shadow-lg">
            <Home className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h3 className="text-2xl font-semibold text-textMain mb-2">
              No Properties for Sale Found
            </h3>
            <p className="text-textSecondary mb-6">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'Check back soon for new listings'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/properties">Browse All Properties</Link>
              </Button>
              <Button variant="primary" asChild>
                <Link to="/post-property">List Your Property</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyPage;
