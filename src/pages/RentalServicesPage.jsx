import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Search,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  ArrowRight,
  CheckCircle,
  Key,
  Upload,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RentalServicesPage Component
 *
 * Main landing page for Rental Services module.
 * Provides access to browse rental properties and submit rental requests.
 */
const RentalServicesPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRentalProperties = async () => {
      try {
        setLoading(true);
        const filters = { type: 'rent', status: 'published' };
        const sortOptions = { sortBy: 'createdAt', sortOrder: 'desc', limit: 12 };
        
        let propertiesData;
        if (searchTerm.trim()) {
          propertiesData = await propertyService.search(searchTerm, filters);
        } else {
          propertiesData = await propertyService.getAll(filters, sortOptions);
        }
        
        // Filter to ensure only rental properties
        propertiesData = (propertiesData || []).filter(
          (p) => p.type?.toLowerCase() === 'rent' || p.listingType?.toLowerCase() === 'rent'
        );
        
        setProperties(propertiesData);
      } catch (error) {
        console.error('Error fetching rental properties:', error);
        toast.error('Failed to load rental properties');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalProperties();
  }, [searchTerm]);

  const features = [
    'Verified rental property listings',
    'Detailed property information and photos',
    'Easy rental request submission',
    'Direct communication with landlords',
    'Flexible rental duration options',
    'Secure rental transactions',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Search Section */}
      <section className="bg-surface py-8 border-b border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rental properties by location, city, or address..."
                className="w-full px-4 py-3 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <Button
              onClick={() => {}}
              className="bg-primary hover:bg-primaryDark text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-textMain mb-2">
                Available Rental Properties
              </h2>
              <p className="text-lg text-textSecondary">
                {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} available for rent
              </p>
            </div>

            {properties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface rounded-lg">
                <Home className="w-16 h-16 text-textSecondary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-textMain mb-2">
                  No Rental Properties Found
                </h3>
                <p className="text-textSecondary mb-6">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Check back soon for new listings'}
                </p>
                {user && (
                  <Button asChild>
                    <Link to="/post-property?type=rent">List Your Property</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/90 via-primary/85 to-primaryDark/90"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white drop-shadow-lg">
              Find Your Perfect Rental Property
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto drop-shadow-md">
              Browse available rental properties or submit a rental request. Connect with property
              owners and find your ideal home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                asChild
              >
                <Link to="/browse-rentals">
                  Browse Rental Properties
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              {user && (
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-surface text-primary hover:bg-primary/10 border-card"
                  asChild
                >
                  <Link to="/post-property?type=rent">List a Property for Rent</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              Your Rental Journey Starts Here
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Whether you're looking to rent a property or submit a rental inquiry, Aptify makes the
              process simple and efficient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Browse Rental Properties Card */}
            <div className="bg-surface rounded-base shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-muted">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary/10 rounded-base mr-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">
                  Browse Rental Properties
                </h2>
              </div>
              <p className="text-textSecondary mb-6 leading-relaxed">
                Explore thousands of verified rental properties in your area. Search through
                detailed listings with high-quality images, property information, and contact
                details to find your perfect rental home.
              </p>
              <Button
                variant="primary"
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                fullWidth
                asChild
              >
                <Link to="/browse-rentals">
                  Browse Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* List Property for Rent Card */}
            <div className="bg-surface rounded-base shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-muted">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary/10 rounded-base mr-4">
                  <Home className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">
                  List a Property for Rent
                </h2>
              </div>
              <p className="text-textSecondary mb-6 leading-relaxed">
                List your property for rent and reach verified tenants. Create detailed listings
                with photos, property information, and rental terms to attract serious renters.
              </p>
              {user ? (
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  fullWidth
                  asChild
                >
                  <Link to="/post-property?type=rent">
                    List Property for Rent
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  fullWidth
                  asChild
                >
                  <Link to="/auth">Sign In to List Property</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-6">
                Why Choose Aptify for Rentals?
              </h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-primary mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-lg text-textMain">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-base p-8 border border-muted shadow-lg">
              <h3 className="text-2xl font-semibold text-textMain mb-4">Get Started Today</h3>
              <p className="text-textSecondary mb-6">
                Find your perfect rental property or submit a rental request. Our platform connects
                tenants with verified property owners for a seamless rental experience.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="bg-primary hover:bg-primaryDark text-white border-primary"
                  fullWidth
                  asChild
                >
                  <Link to="/browse-rentals">Browse Rental Properties</Link>
                </Button>
                {user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    fullWidth
                    asChild
                  >
                    <Link to="/post-property?type=rent">List Property for Rent</Link>
                  </Button>
                )}
                {!user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    fullWidth
                    asChild
                  >
                    <Link to="/auth">Sign In to List Property</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/95 via-primary/90 to-primaryDark/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white drop-shadow-lg">
            Ready to Find Your Rental Property?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Join thousands of satisfied tenants who have found their perfect rental home through
            Aptify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary hover:bg-primaryDark text-white border-primary"
              asChild
            >
              <Link to="/browse-rentals">Browse Rental Properties</Link>
            </Button>
            {user && (
              <Button
                size="lg"
                variant="outline"
                className="bg-surface text-primary hover:bg-primary/10 border-card"
                asChild
              >
                <Link to="/list-property?type=rent">List Property for Rent</Link>
              </Button>
            )}
            {!user && (
              <Button
                size="lg"
                variant="outline"
                className="bg-surface text-primary hover:bg-primary/10 border-card"
                asChild
              >
                <Link to="/auth">Sign In to Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RentalServicesPage;
