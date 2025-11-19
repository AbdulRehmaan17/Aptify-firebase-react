import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Wrench, Hammer, Paintbrush, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

/**
 * RenovationServicesPage Component
 *
 * Main landing page for renovation services.
 * Provides information about renovation services and links to construction providers.
 */
const RenovationServicesPage = () => {
  const { user } = useAuth();

  const services = [
    {
      icon: <Hammer className="w-8 h-8" />,
      title: 'New Construction',
      description:
        'Build your dream property from the ground up with our expert construction team.',
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: 'Extension & Remodeling',
      description:
        'Expand or transform your existing property with professional renovation services.',
    },
    {
      icon: <Paintbrush className="w-8 h-8" />,
      title: 'Interior Design',
      description: 'Redesign your space with modern interior design solutions.',
    },
    {
      icon: <Building2 className="w-8 h-8" />,
      title: 'Property Renovation',
      description: 'Complete property renovation services for all property types.',
    },
  ];

  const features = [
    'Expert construction professionals',
    'Quality materials and craftsmanship',
    'Timely project completion',
    'Competitive pricing',
    'Free consultation and quotes',
    'Project management support',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-emerald-800/85 to-teal-900/90"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white drop-shadow-lg">
              Professional Renovation Services
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-teal-50 max-w-3xl mx-auto drop-shadow-md">
              Transform your property with our expert renovation and construction services
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
                asChild
              >
                <Link to="/renovation-list">
                  Browse Providers
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              {user && (
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white text-teal-600 hover:bg-teal-50 border-white"
                  asChild
                >
                  <Link to="/renovation-request">Request Service</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Our Renovation Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive renovation solutions for all your property needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-teal-100"
              >
                <div className="text-teal-600 mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
                Why Choose Our Renovation Services?
              </h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-lg text-gray-700">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-8 border border-teal-200 shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get Started Today</h3>
              <p className="text-gray-600 mb-6">
                Connect with our verified renovation providers and get quotes for your renovation
                project.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
                  fullWidth
                  asChild
                >
                  <Link to="/renovation-list">Browse Renovation Providers</Link>
                </Button>
                {user && (
                  <Button
                    variant="outline"
                    className="border-teal-600 text-teal-600 hover:bg-teal-50"
                    fullWidth
                    asChild
                  >
                    <Link to="/renovation-request">Submit Renovation Request</Link>
                  </Button>
                )}
                {!user && (
                  <Button
                    variant="outline"
                    className="border-teal-600 text-teal-600 hover:bg-teal-50"
                    fullWidth
                    asChild
                  >
                    <Link to="/auth">Sign In to Request Service</Link>
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
              'url(https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-800/95 via-emerald-700/90 to-teal-800/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white drop-shadow-lg">
            Ready to Transform Your Property?
          </h2>
          <p className="text-xl text-teal-50 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Get in touch with our expert team and start your renovation journey today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-teal-500 hover:bg-teal-600 text-white border-teal-500"
              asChild
            >
              <Link to="/renovation-list">Find a Provider</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-teal-600 hover:bg-teal-50 border-white"
              asChild
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RenovationServicesPage;
