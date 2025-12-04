import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Filter, MapPin, DollarSign, Calendar } from 'lucide-react';
import propertyService from '../../services/propertyService';
import PropertyCard from '../../components/property/PropertyCard';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RentalRequestForm from '../RentalRequestForm';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

/**
 * RentalBrowse Component
 * Browse all available rental properties with filters
 */
const RentalBrowse = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    city: '',
  });
  const [sortBy, setSortBy] = useState('newest');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    loadProperties();
  }, [filters, sortBy]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const queryFilters = {
        type: 'rent',
        status: 'published',
      };

      // Apply filters
      if (filters.city) {
        queryFilters.city = filters.city;
      }

      const sortOptions = {
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'price-low' ? 'price' : 'price',
        sortOrder: sortBy === 'price-high' ? 'desc' : 'asc',
      };

      let propertiesData = await propertyService.getAll(queryFilters, sortOptions);

      // Filter by type
      propertiesData = (propertiesData || []).filter(
        (p) => p.type?.toLowerCase() === 'rent' || p.listingType?.toLowerCase() === 'rent'
      );

      // Apply price filter
      if (filters.minPrice) {
        propertiesData = propertiesData.filter((p) => p.price >= Number(filters.minPrice));
      }
      if (filters.maxPrice) {
        propertiesData = propertiesData.filter((p) => p.price <= Number(filters.maxPrice));
      }

      // Apply search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        propertiesData = propertiesData.filter(
          (p) =>
            p.title?.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.address?.city?.toLowerCase().includes(searchLower) ||
            p.location?.toLowerCase().includes(searchLower)
        );
      }

      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading rental properties:', error);
      toast.error('Failed to load rental properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRental = (property) => {
    setSelectedProperty(property);
    setShowRequestModal(true);
  };

  const handleRequestSuccess = () => {
    setShowRequestModal(false);
    setSelectedProperty(null);
    toast.success('Rental request submitted successfully!');
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      city: '',
    });
    setSearchTerm('');
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-surface py-8 border-b border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-textMain mb-2">
              Browse Rental Properties
            </h1>
            <p className="text-textSecondary">
              Find your perfect rental property from our verified listings
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by location, city, or property name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <Button
                variant="primary"
                onClick={loadProperties}
                className="bg-primary hover:bg-primaryDark text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                City
              </label>
              <Input
                placeholder="Any city"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Min Price (PKR)
              </label>
              <Input
                type="number"
                placeholder="Min price"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Max Price (PKR)
              </label>
              <Input
                type="number"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {(filters.minPrice || filters.maxPrice || filters.city || searchTerm) && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <span className="text-sm text-textSecondary">
                {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div key={property.id} className="relative">
                  <PropertyCard property={property} />
                  <div className="mt-2">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => handleRequestRental(property)}
                      className="bg-primary hover:bg-primaryDark text-white"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Request Rental
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-surface rounded-lg border border-muted">
              <Home className="w-16 h-16 text-textSecondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-textMain mb-2">
                No Rental Properties Found
              </h3>
              <p className="text-textSecondary mb-6">
                {searchTerm || filters.minPrice || filters.maxPrice || filters.city
                  ? 'Try adjusting your search criteria'
                  : 'Check back soon for new listings'}
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Rental Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedProperty(null);
        }}
        title={`Request Rental: ${selectedProperty?.title || ''}`}
        size="lg"
      >
        {selectedProperty && (
          <RentalRequestForm
            propertyId={selectedProperty.id}
            propertyTitle={selectedProperty.title}
            onSuccess={handleRequestSuccess}
            onCancel={() => {
              setShowRequestModal(false);
              setSelectedProperty(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default RentalBrowse;

