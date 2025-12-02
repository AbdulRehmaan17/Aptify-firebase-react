import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Home, MapPin, DollarSign } from 'lucide-react';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RentPage Component
 *
 * Dedicated page for rental properties.
 * Displays properties filtered by type: 'rent'
 */
const RentPage = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const fetchRentalProperties = async () => {
      try {
        setLoading(true);

        // Filter properties by type: 'rent'
        const filters = { type: 'rent', status: 'published' };
        const sortOptions = { sortBy: 'createdAt', sortOrder: 'desc' };

        let propertiesData;
        if (searchTerm.trim()) {
          propertiesData = await propertyService.search(searchTerm, filters);
        } else {
          propertiesData = await propertyService.getAll(filters, sortOptions);
        }

        setProperties(propertiesData || []);
      } catch (error) {
        console.error('Error fetching rental properties:', error);
        toast.error(`Failed to load rental properties: ${error.message || 'Unknown error'}`);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalProperties();
  }, [searchTerm]);

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
            <h1 className="text-4xl font-display font-bold text-textMain">Rental Properties</h1>
          </div>
          <p className="text-lg text-textSecondary">
            Find your perfect rental property from our curated selection
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const search = formData.get('search');
              if (search) {
                window.location.href = `/rent?search=${encodeURIComponent(search)}`;
              }
            }}
            className="flex gap-4"
          >
            <input
              type="text"
              name="search"
              defaultValue={searchTerm}
              placeholder="Search by location, city, or address..."
              className="flex-1 px-4 py-3 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
        </div>

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <>
            <div className="mb-4 text-textSecondary">
              Found {properties.length} rental {properties.length === 1 ? 'property' : 'properties'}
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
              No Rental Properties Found
            </h3>
            <p className="text-textSecondary mb-6">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'Check back soon for new rental listings'}
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

export default RentPage;
