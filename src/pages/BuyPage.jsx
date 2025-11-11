import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Home, MapPin, DollarSign } from 'lucide-react';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import Button from '../components/common/Button';
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
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const fetchSaleProperties = async () => {
      try {
        setLoading(true);
        
        // Filter properties by type: 'sale'
        const filters = { type: 'sale', status: 'published' };
        const sortOptions = { sortBy: 'createdAt', sortOrder: 'desc' };

        let propertiesData;
        if (searchTerm.trim()) {
          propertiesData = await propertyService.search(searchTerm, filters);
        } else {
          propertiesData = await propertyService.getAll(filters, sortOptions);
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

    fetchSaleProperties();
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Home className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-4xl font-display font-bold text-gray-900">
              Properties for Sale
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Discover your dream property from our exclusive listings
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
                window.location.href = `/buy?search=${encodeURIComponent(search)}`;
              }
            }}
            className="flex gap-4"
          >
            <input
              type="text"
              name="search"
              defaultValue={searchTerm}
              placeholder="Search by location, city, or address..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
        </div>

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <>
            <div className="mb-4 text-gray-600">
              Found {properties.length} {properties.length === 1 ? 'property' : 'properties'} for sale
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <Home className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              No Properties for Sale Found
            </h3>
            <p className="text-gray-600 mb-6">
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


