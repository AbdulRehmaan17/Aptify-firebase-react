import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Hammer, Paintbrush, HardHat, ArrowRight, CheckCircle, Users, Star } from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

/**
 * Renovation.jsx - Main landing page for renovation services
 */
const Renovation = () => {
  const { user } = useAuth();

  const services = [
    {
      icon: <Wrench className="w-8 h-8" />,
      title: 'Interior Renovation',
      description: 'Transform your interior spaces with professional renovation services.',
    },
    {
      icon: <Hammer className="w-8 h-8" />,
      title: 'Kitchen Remodeling',
      description: 'Complete kitchen renovation and remodeling solutions.',
    },
    {
      icon: <Paintbrush className="w-8 h-8" />,
      title: 'Bathroom Renovation',
      description: 'Modernize your bathrooms with expert renovation services.',
    },
    {
      icon: <HardHat className="w-8 h-8" />,
      title: 'Complete Home Renovation',
      description: 'Full home renovation services from design to completion.',
    },
  ];

  const features = [
    'Expert renovation professionals',
    'Quality materials and craftsmanship',
    'Timely project completion',
    'Competitive pricing',
    'Free consultation and quotes',
    'Project management support',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Wrench className="w-20 h-20 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Professional Renovation Services
            </h1>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Connect with verified renovation professionals for your next project
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/renovation-providers">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                  Browse Providers
                </Button>
              </Link>
              {user ? (
                <Link to="/request-renovation">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Request Service
                  </Button>
                </Link>
              ) : (
                <Link to="/register-renovator">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Become a Provider
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-lg text-gray-600">Comprehensive renovation solutions for every need</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="text-purple-600 mb-4">{service.icon}</div>
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Why Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <p className="text-gray-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Start Your Project?</h2>
          <p className="text-xl text-purple-100 mb-8">
            Browse our verified renovation providers or register as one
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/renovation-providers">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                <Users className="w-5 h-5 mr-2" />
                Find Providers
              </Button>
            </Link>
            <Link to="/register-renovator">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Wrench className="w-5 h-5 mr-2" />
                Register as Provider
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Renovation;

