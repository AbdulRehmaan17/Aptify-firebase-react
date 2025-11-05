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
  const [filters, setFilters] = useState({
    type: '',
    status: '', // Empty string means no status filter - show all properties
    city: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    furnished: null,
    parking: null,
  });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    // Update search term from URL params
    const searchFromUrl = searchParams.get('search') || '';
    setSearchTerm(searchFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const firestoreFilters = buildFirestoreFilters();
        const sortOptions = getSortOptions();

        console.log('Fetching properties with filters:', firestoreFilters);
        console.log('Sort options:', sortOptions);

        let propertiesData;
        if (searchTerm.trim()) {
          console.log('Using search with term:', searchTerm);
          propertiesData = await propertyService.search(searchTerm, firestoreFilters);
        } else {
          console.log('Using getAll');
          propertiesData = await propertyService.getAll(firestoreFilters, sortOptions);
        }

        console.log('Properties fetched:', propertiesData);
        console.log('Properties count:', propertiesData?.length || 0);

        setProperties(propertiesData || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        toast.error(`Failed to load properties: ${error.message || 'Unknown error'}`);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters, sortBy, searchTerm]);

  const buildFirestoreFilters = () => {
    const firestoreFilters = {};

    if (filters.type) {
      firestoreFilters.type = filters.type;
    }

    // Only add status filter if explicitly set (not empty string)
    if (filters.status && filters.status.trim() !== '') {
      firestoreFilters.status = filters.status;
    }

    if (filters.city) {
      firestoreFilters.city = filters.city;
    }

    if (filters.minPrice !== null && filters.minPrice !== '') {
      firestoreFilters.minPrice = Number(filters.minPrice);
    }

    if (filters.maxPrice !== null && filters.maxPrice !== '') {
      firestoreFilters.maxPrice = Number(filters.maxPrice);
    }

    if (filters.bedrooms !== null && filters.bedrooms !== '') {
      firestoreFilters.minBedrooms = Number(filters.bedrooms);
    }

    if (filters.bathrooms !== null && filters.bathrooms !== '') {
      firestoreFilters.minBathrooms = Number(filters.bathrooms);
    }

    if (filters.furnished !== null) {
      firestoreFilters.furnished = filters.furnished;
    }

    if (filters.parking !== null) {
      firestoreFilters.parking = filters.parking;
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
    setSearchParams(prev => ({
      ...Object.fromEntries(prev),
      sort: newSort
    }));
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setSearchParams(prev => ({
      ...Object.fromEntries(prev),
      ...newFilters
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled in useEffect
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
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-4">
          Browse Properties
        </h1>
        <p className="text-lg text-gray-600">
          Find your perfect rental or purchase property
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by location, property type..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
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
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <SortAsc className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid'
                    ? 'bg-luxury-gold text-luxury-black'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list'
                    ? 'bg-luxury-gold text-luxury-black'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {properties.length > 0 ? (
            <div className={`${viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
              }`}>
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Grid className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No properties found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters or search criteria
              </p>
              <Button
                onClick={() => {
                  setFilters({
                    type: '',
                    status: '', // Empty = show all properties
                    city: '',
                    minPrice: null,
                    maxPrice: null,
                    bedrooms: null,
                    bathrooms: null,
                    furnished: null,
                    parking: null,
                  });
                  setSearchTerm('');
                }}
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

