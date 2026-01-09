import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, SortAsc } from 'lucide-react';
import propertyService from '../../services/propertyService';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * BrowsePropertiesBase Component
 * 
 * Shared base component for Browse Properties and Browse Rental Properties pages.
 * Ensures 100% DOM parity - exact same JSX tree and CSS classes.
 * 
 * @param {Object} props
 * @param {'all'|'rent'} props.mode - Filter mode: 'all' for all properties, 'rent' for rentals only
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 */
const BrowsePropertiesBase = ({ mode = 'all', title, description }) => {
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
    type: mode === 'rent' ? 'rent' : (searchParams.get('type') || ''),
    status: '',
    city: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    furnished: null,
    parking: null,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    type: mode === 'rent' ? 'rent' : (searchParams.get('type') || ''),
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
    if (typeFromUrl && mode !== 'rent') {
      const initialFilters = { ...filters, type: typeFromUrl };
      setFilters(initialFilters);
      setAppliedFilters(initialFilters);
    }
  }, []); // Only run on mount

  // Fetch all properties once on mount, then filter/sort client-side
  const [allProperties, setAllProperties] = useState([]);
  
  useEffect(() => {
    const fetchAllProperties = async () => {
      try {
        setLoading(true);
        // Fetch ALL properties without filters (simple query, no index needed)
        const allPropertiesData = await propertyService.getAll({}, {});
        setAllProperties(allPropertiesData || []);
        setProperties(allPropertiesData || []);
        setHasMore((allPropertiesData || []).length >= ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Error fetching properties:', error);
        setAllProperties([]);
        setProperties([]);
        toast.error('Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchAllProperties();
  }, []); // Only fetch once on mount

  // Apply filters and sorting client-side whenever filters or sort changes
  useEffect(() => {
    if (allProperties.length === 0) return;

    let filtered = [...allProperties];

    // For rent mode, always pre-filter for rental properties
    if (mode === 'rent') {
      filtered = filtered.filter((p) => {
        const propertyType = p.listingType || p.type || '';
        return propertyType.toLowerCase() === 'rent';
      });
    }

    // Apply search term filter
    if (appliedSearchTerm.trim()) {
      const searchLower = appliedSearchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const city = (p.address?.city || p.city || '').toLowerCase();
        return title.includes(searchLower) || description.includes(searchLower) || city.includes(searchLower);
      });
    }

    // Apply all other filters
    // Force type='rent' for rent mode internally
    const effectiveFilters = mode === 'rent' 
      ? { ...appliedFilters, type: 'rent' }
      : appliedFilters;
    
    const firestoreFilters = buildFirestoreFilters(effectiveFilters);
    
    if (firestoreFilters.status) {
      filtered = filtered.filter((p) => p.status === firestoreFilters.status);
    }

    if (firestoreFilters.type) {
      filtered = filtered.filter((p) => {
        const propertyType = p.listingType || p.type || '';
        return propertyType.toLowerCase() === firestoreFilters.type.toLowerCase();
      });
    }

    if (firestoreFilters.city) {
      const cityLower = firestoreFilters.city.toLowerCase();
      filtered = filtered.filter((p) => {
        const propertyCity = p.address?.city?.toLowerCase() || p.city?.toLowerCase() || '';
        return propertyCity.includes(cityLower);
      });
    }

    if (typeof firestoreFilters.minPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) >= firestoreFilters.minPrice);
    }

    if (typeof firestoreFilters.maxPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) <= firestoreFilters.maxPrice);
    }

    if (typeof firestoreFilters.bedrooms === 'number') {
      filtered = filtered.filter((p) => (p.bedrooms || 0) >= firestoreFilters.bedrooms);
    }

    if (typeof firestoreFilters.bathrooms === 'number') {
      filtered = filtered.filter((p) => (p.bathrooms || 0) >= firestoreFilters.bathrooms);
    }

    if (firestoreFilters.furnished !== undefined && firestoreFilters.furnished !== null) {
      filtered = filtered.filter((p) => Boolean(p.furnished) === Boolean(firestoreFilters.furnished));
    }

    if (firestoreFilters.parking !== undefined && firestoreFilters.parking !== null) {
      filtered = filtered.filter((p) => Boolean(p.parking) === Boolean(firestoreFilters.parking));
    }

    // Apply sorting
    const sortOptions = getSortOptions();
    if (sortOptions.sortBy === 'createdAt') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return sortOptions.sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      });
    } else if (sortOptions.sortBy === 'price') {
      filtered.sort((a, b) => {
        const aPrice = a.price || 0;
        const bPrice = b.price || 0;
        return sortOptions.sortOrder === 'desc' ? bPrice - aPrice : aPrice - bPrice;
      });
    }

    // Apply pagination limit
    const paginated = filtered.slice(0, ITEMS_PER_PAGE);
    
    setProperties(paginated);
    setHasMore(filtered.length > ITEMS_PER_PAGE);
  }, [allProperties, appliedFilters, sortBy, appliedSearchTerm, mode]);

  const buildFirestoreFilters = (filterState = appliedFilters) => {
    const firestoreFilters = {};

    // For rent mode, always force type='rent'
    if (mode === 'rent') {
      firestoreFilters.type = 'rent';
    } else if (filterState.type) {
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
    // Convert PropertyFilters format to base format
    const convertedFilters = {
      type: newFilters.type || filters.type || '',
      status: filters.status || '',
      city: newFilters.city || '',
      minPrice: newFilters.minPrice ?? null,
      maxPrice: newFilters.maxPrice ?? null,
      bedrooms: newFilters.bedrooms ?? null,
      bathrooms: newFilters.bathrooms ?? null,
      furnished: newFilters.furnished ?? null,
      parking: newFilters.parking ?? null,
    };
    
    // For rent mode, force type='rent' internally (UI can show user selection, but logic enforces rent)
    if (mode === 'rent') {
      convertedFilters.type = 'rent';
    }
    
    // Only update local filter state - don't apply yet
    setFilters(convertedFilters);
  };

  // Apply filters when user clicks "Apply Filters" button
  const handleApplyFilters = () => {
    // For rent mode, force type='rent' before applying
    const filtersToApply = mode === 'rent' 
      ? { ...filters, type: 'rent' }
      : filters;
    
    setAppliedFilters(filtersToApply);
    setAppliedSearchTerm(searchTerm);
    // Reset pagination
    setHasMore(true);
    // Update URL params
    setSearchParams((prev) => {
      const newParams = { ...Object.fromEntries(prev) };
      if (filtersToApply.type && mode !== 'rent') newParams.type = filtersToApply.type;
      if (searchTerm) newParams.search = searchTerm;
      return newParams;
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    const emptyFilters = {
      type: mode === 'rent' ? 'rent' : '',
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

  const handleLoadMore = () => {
    // Client-side pagination: show next page of already filtered results
    if (loadingMore || !hasMore || allProperties.length === 0) return;
    
    setLoadingMore(true);
    
    // Re-apply all filters and sorting to get full filtered set
    let filtered = [...allProperties];
    
    // For rent mode, always pre-filter for rental properties
    if (mode === 'rent') {
      filtered = filtered.filter((p) => {
        const propertyType = p.listingType || p.type || '';
        return propertyType.toLowerCase() === 'rent';
      });
    }
    
    // Force type='rent' for rent mode internally
    const effectiveFilters = mode === 'rent' 
      ? { ...appliedFilters, type: 'rent' }
      : appliedFilters;
    
    const firestoreFilters = buildFirestoreFilters(effectiveFilters);
    
    if (appliedSearchTerm.trim()) {
      const searchLower = appliedSearchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const city = (p.address?.city || p.city || '').toLowerCase();
        return title.includes(searchLower) || description.includes(searchLower) || city.includes(searchLower);
      });
    }
    
    if (firestoreFilters.status) {
      filtered = filtered.filter((p) => p.status === firestoreFilters.status);
    }
    if (firestoreFilters.type) {
      filtered = filtered.filter((p) => {
        const propertyType = p.listingType || p.type || '';
        return propertyType.toLowerCase() === firestoreFilters.type.toLowerCase();
      });
    }
    if (firestoreFilters.city) {
      const cityLower = firestoreFilters.city.toLowerCase();
      filtered = filtered.filter((p) => {
        const propertyCity = p.address?.city?.toLowerCase() || p.city?.toLowerCase() || '';
        return propertyCity.includes(cityLower);
      });
    }
    if (typeof firestoreFilters.minPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) >= firestoreFilters.minPrice);
    }
    if (typeof firestoreFilters.maxPrice === 'number') {
      filtered = filtered.filter((p) => (p.price || 0) <= firestoreFilters.maxPrice);
    }
    if (typeof firestoreFilters.bedrooms === 'number') {
      filtered = filtered.filter((p) => (p.bedrooms || 0) >= firestoreFilters.bedrooms);
    }
    if (typeof firestoreFilters.bathrooms === 'number') {
      filtered = filtered.filter((p) => (p.bathrooms || 0) >= firestoreFilters.bathrooms);
    }
    if (firestoreFilters.furnished !== undefined && firestoreFilters.furnished !== null) {
      filtered = filtered.filter((p) => Boolean(p.furnished) === Boolean(firestoreFilters.furnished));
    }
    if (firestoreFilters.parking !== undefined && firestoreFilters.parking !== null) {
      filtered = filtered.filter((p) => Boolean(p.parking) === Boolean(firestoreFilters.parking));
    }
    
    // Apply sorting
    const sortOptions = getSortOptions();
    if (sortOptions.sortBy === 'createdAt') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return sortOptions.sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      });
    } else if (sortOptions.sortBy === 'price') {
      filtered.sort((a, b) => {
        const aPrice = a.price || 0;
        const bPrice = b.price || 0;
        return sortOptions.sortOrder === 'desc' ? bPrice - aPrice : aPrice - bPrice;
      });
    }
    
    // Get next page
    const nextPageCount = properties.length + ITEMS_PER_PAGE;
    const nextPageFiltered = filtered.slice(0, nextPageCount);
    setProperties(nextPageFiltered);
    setHasMore(filtered.length > nextPageFiltered.length);
    setLoadingMore(false);
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
        <h1 className="text-3xl font-display font-bold text-textMain mb-4">{title}</h1>
        <p className="text-lg text-textSecondary">{description}</p>
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
          <PropertyFilters
            filters={filters}
            onFiltersChange={(newFilters) => {
              // Update filter state
              handleFiltersChange(newFilters);
              // Immediately apply filters (PropertyFilters has its own Apply button, but we need to trigger apply here)
              // The PropertyFilters component will call onFiltersChange when Apply is clicked
              // So we need to also trigger the actual apply
              const convertedFilters = {
                type: newFilters.type || '',
                status: filters.status || '',
                city: newFilters.city || '',
                minPrice: newFilters.minPrice ?? null,
                maxPrice: newFilters.maxPrice ?? null,
                bedrooms: newFilters.bedrooms ?? null,
                bathrooms: newFilters.bathrooms ?? null,
                furnished: newFilters.furnished ?? null,
                parking: newFilters.parking ?? null,
              };
              // For rent mode, force type='rent' internally (UI shows user selection, but results always filter for rent)
              if (mode === 'rent') {
                convertedFilters.type = 'rent';
              }
              setAppliedFilters(convertedFilters);
              setHasMore(true);
            }}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
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

export default BrowsePropertiesBase;

