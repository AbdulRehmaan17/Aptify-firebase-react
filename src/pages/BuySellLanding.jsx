import React from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Search,
  Upload,
  Building2,
  MapPin,
  DollarSign,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

/**
 * BuySellLanding Component
 *
 * Main landing page for Buy/Sell module.
 * Provides access to browse properties and list properties functionality.
 */
const BuySellLanding = () => {
  const { user } = useAuth();

  const features = [
    'Verified property listings',
    'Detailed property information',
    'High-quality property images',
    'Easy search and filter options',
    'Secure property transactions',
    'Professional property management',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/90 via-primary/85 to-primaryDark/90"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white drop-shadow-lg">
              Simplify Buying and Selling Apartments
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto drop-shadow-md">
              Browse listed properties or post your own. Find your dream home or sell your property
              with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                asChild
              >
                <Link to="/properties?type=sale">
                  Browse Properties
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-surface text-primary hover:bg-primary/10 border-card"
                asChild
              >
                <Link to="/post-property?type=sale">List a Property</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Browse Properties Card */}
            <div className="bg-surface rounded-base shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-muted">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-accent/10 rounded-base mr-4">
                  <Search className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">Browse Properties</h2>
              </div>
              <p className="text-textSecondary mb-6 leading-relaxed">
                Find apartments available for sale in your area. Search through thousands of
                verified listings with detailed information, high-quality images, and comprehensive
                property details.
              </p>
              <Button
                variant="primary"
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                fullWidth
                asChild
              >
                <Link to="/properties?type=sale">
                  Browse Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* List Property Card */}
            <div className="bg-surface rounded-base shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-muted">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-accent/10 rounded-base mr-4">
                  <Upload className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-textMain">List a Property</h2>
              </div>
              <p className="text-textSecondary mb-6 leading-relaxed">
                Post your apartment for sale and reach verified buyers. Create detailed listings
                with photos, property information, and contact details to attract serious buyers.
              </p>
              {user ? (
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  fullWidth
                  asChild
                >
                  <Link to="/post-property?type=sale">
                    List Your Property
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
                  <Link to="/auth?next=/post-property?type=sale">Sign In to List Property</Link>
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
                Why Choose Aptify for Buying & Selling?
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
                Whether you're looking to buy your dream home or sell your property, Aptify makes
                the process simple and secure.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="bg-primary hover:bg-primaryDark text-white border-primary"
                  fullWidth
                  asChild
                >
                  <Link to="/properties?type=sale">Browse Properties</Link>
                </Button>
                {user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    fullWidth
                    asChild
                  >
                    <Link to="/post-property?type=sale">List Your Property</Link>
                  </Button>
                )}
                {!user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    fullWidth
                    asChild
                  >
                    <Link to="/auth?next=/post-property?type=sale">Sign In to List Property</Link>
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
              'url(https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/95 via-primary/90 to-primaryDark/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white drop-shadow-lg">
            Ready to Find or Sell Your Property?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Join thousands of satisfied customers who have found their perfect home or successfully
            sold their property with Aptify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-primary hover:bg-primaryDark text-white border-primary"
              asChild
            >
              <Link to="/properties?type=sale">Browse Properties</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-surface text-primary hover:bg-primary/10 border-card"
              asChild
            >
              <Link to="/post-property?type=sale">List a Property</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuySellLanding;
