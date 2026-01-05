import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Grid, List, SortAsc } from 'lucide-react';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import ProductFilters from '../components/product/ProductFilters';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PropertiesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 12;
  // Separate filter state (what user is editing) from applied filters (what's actually used)
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '', // Get type from URL params (e.g., ?type=sale)
    status: '', // Empty string means no status filter - show all properties
    city: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    furnished: null,
    parking: null,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    type: searchParams.get('type') || '',
    status: '',
    city: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    furnished: null,
    parking: null,
  });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    // Update search term and type from URL params on mount
    const searchFromUrl = searchParams.get('search') || '';
    const typeFromUrl = searchParams.get('type') || '';
    setSearchTerm(searchFromUrl);
    setAppliedSearchTerm(searchFromUrl);
    if (typeFromUrl) {
      const initialFilters = { ...filters, type: typeFromUrl };
      setFilters(initialFilters);
      setAppliedFilters(initialFilters);
    }
  }, []); // Only run on mount

  // Fetch properties only when applied filters or sort changes (not on every filter state change)
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        // Reset pagination when filters change
        setHasMore(true);
        
        const firestoreFilters = buildFirestoreFilters(appliedFilters);
        const sortOptions = getSortOptions();

        console.log('Fetching properties with applied filters:', firestoreFilters);
        console.log('Sort options:', sortOptions);

        let propertiesData;
        if (appliedSearchTerm.trim()) {
          console.log('Using search with term:', appliedSearchTerm);
          propertiesData = await propertyService.search(appliedSearchTerm, firestoreFilters);
        } else {
          console.log('Using getAll');
          const allOptions = { ...sortOptions, limit: ITEMS_PER_PAGE };
          propertiesData = await propertyService.getAll(firestoreFilters, allOptions);
        }

        console.log('Properties fetched:', propertiesData);
        console.log('Properties count:', propertiesData?.length || 0);

        setProperties(propertiesData || []);
        setHasMore(propertiesData?.length >= ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error fetching properties:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        // AUTO-FIXED: Handle permission errors gracefully
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Properties are publicly readable - check Firestore rules.');
        } else {
          toast.error(`Failed to load properties: ${error.message || 'Unknown error'}`);
        }
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [appliedFilters, sortBy, appliedSearchTerm]); // Only fetch when applied filters change

  const buildFirestoreFilters = (filterState = appliedFilters) => {
    const firestoreFilters = {};

    if (filterState.type) {
      firestoreFilters.type = filterState.type;
    }

    // Only add status filter if explicitly set (not empty string)
    if (filterState.status && filterState.status.trim() !== '') {
      firestoreFilters.status = filterState.status;
    }

    if (filterState.city) {
      firestoreFilters.city = filterState.city;
    }

    if (filterState.minPrice !== null && filterState.minPrice !== '') {
      firestoreFilters.minPrice = Number(filterState.minPrice);
    }

    if (filterState.maxPrice !== null && filterState.maxPrice !== '') {
      firestoreFilters.maxPrice = Number(filterState.maxPrice);
    }

    if (filterState.bedrooms !== null && filterState.bedrooms !== '') {
      firestoreFilters.minBedrooms = Number(filterState.bedrooms);
    }

    if (filterState.bathrooms !== null && filterState.bathrooms !== '') {
      firestoreFilters.minBathrooms = Number(filterState.bathrooms);
    }

    if (filterState.furnished !== null) {
      firestoreFilters.furnished = filterState.furnished;
    }

    if (filterState.parking !== null) {
      firestoreFilters.parking = filterState.parking;
    }

    return firestoreFilters;
  };

  const getSortOptions = () => {
    switch (sortBy) {
      case 'price-low':
        return { sortBy: 'price', sortOrder: 'asc' };
      case 'price-high':
        return { sortBy: 'price', sortOrder: 'desc' };
      case 'newest':
        return { sortBy: 'createdAt', sortOrder: 'desc' };
      case 'oldest':
        return { sortBy: 'createdAt', sortOrder: 'asc' };
      default:
        return { sortBy: 'createdAt', sortOrder: 'desc' };
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev),
      sort: newSort,
    }));
  };

  const handleFiltersChange = (newFilters) => {
    // Only update local filter state - don't apply yet
    setFilters(newFilters);
  };

  // Apply filters when user clicks "Apply Filters" button
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setAppliedSearchTerm(searchTerm);
    // Reset pagination
    setHasMore(true);
    // Update URL params
    setSearchParams((prev) => {
      const newParams = { ...Object.fromEntries(prev) };
      if (filters.type) newParams.type = filters.type;
      if (searchTerm) newParams.search = searchTerm;
      return newParams;
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    const emptyFilters = {
      type: '',
      status: '',
      city: '',
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      bathrooms: null,
      furnished: null,
      parking: null,
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSearchTerm('');
    setAppliedSearchTerm('');
    setSearchParams({});
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Apply search immediately when form is submitted
    handleApplyFilters();
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const firestoreFilters = buildFirestoreFilters(appliedFilters);
      const sortOptions = getSortOptions();
      const allOptions = {
        ...sortOptions,
        limit: ITEMS_PER_PAGE,
        startAfter: properties.length,
      };

      let moreProperties;
      if (appliedSearchTerm.trim()) {
        moreProperties = await propertyService.search(appliedSearchTerm, firestoreFilters);
        // Client-side pagination for search results
        moreProperties = moreProperties.slice(properties.length, properties.length + ITEMS_PER_PAGE);
      } else {
        moreProperties = await propertyService.getAll(firestoreFilters, allOptions);
      }

      if (moreProperties.length > 0) {
        setProperties((prev) => [...prev, ...moreProperties]);
        setHasMore(moreProperties.length >= ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more properties:', error);
      toast.error('Failed to load more properties');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-textMain mb-4">Browse Properties</h1>
        <p className="text-lg text-textSecondary">Find your perfect rental or purchase property</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by location, property type..."
            className="flex-1 px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <ProductFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={['sale', 'rent', 'renovation']}
            brands={[]}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
          {/* Apply Filters Button */}
          <div className="mt-4 space-y-2">
            <Button
              onClick={handleApplyFilters}
              variant="primary"
              className="w-full"
            >
              Apply Filters
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-textSecondary">
                {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <SortAsc className="w-4 h-4 text-textSecondary" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-muted rounded-base px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-muted rounded-base overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'text-textSecondary hover:bg-muted'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'text-textSecondary hover:bg-muted'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {properties.length > 0 ? (
            <>
            <div
              className={`${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }`}
            >
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button
                    onClick={handleLoadMore}
                    loading={loadingMore}
                    variant="outline"
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More Properties'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-textSecondary mb-4">
                <Grid className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-textMain mb-2">No properties found</h3>
              <p className="text-textSecondary mb-6">Try adjusting your filters or search criteria</p>
              <Button
                onClick={handleClearFilters}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertiesPage;
