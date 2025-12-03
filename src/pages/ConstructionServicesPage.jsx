import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Hammer, Wrench, HardHat, ArrowRight, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * ConstructionServicesPage Component
 *
 * Main landing page for construction services.
 * Lists all available construction service categories from providers.
 */
const ConstructionServicesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default categories if none found
  const defaultServices = [
    {
      icon: <Building2 className="w-8 h-8" />,
      title: 'New Construction',
      description:
        'Build your dream property from the ground up with our expert construction team.',
    },
    {
      icon: <Hammer className="w-8 h-8" />,
      title: 'Extension & Addition',
      description:
        'Expand your existing property with professional construction and extension services.',
    },
    {
      icon: <HardHat className="w-8 h-8" />,
      title: 'Grey Structure',
      description:
        'Complete grey structure construction with quality materials and expert workmanship.',
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: 'Remodeling',
      description: 'Transform your existing property with comprehensive remodeling solutions.',
    },
  ];

  // Icon mapping for categories
  const categoryIcons = {
    'New Construction': <Building2 className="w-8 h-8" />,
    'Extension': <Hammer className="w-8 h-8" />,
    'Remodeling': <Wrench className="w-8 h-8" />,
    'Finishing': <HardHat className="w-8 h-8" />,
    'Grey Structure': <HardHat className="w-8 h-8" />,
    'Commercial': <Building2 className="w-8 h-8" />,
    'Residential': <Building2 className="w-8 h-8" />,
    'Interior Design': <Wrench className="w-8 h-8" />,
    'Architectural Design': <Building2 className="w-8 h-8" />,
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Fetch all approved construction providers
        const providersQuery = query(
          collection(db, 'providers'),
          where('type', '==', 'construction'),
          where('isApproved', '==', true)
        );

        const snapshot = await getDocs(providersQuery);
        const allSpecializations = new Set();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const specs = Array.isArray(data.specialization)
            ? data.specialization
            : data.specialization
              ? [data.specialization]
              : [];
          specs.forEach((spec) => {
            if (spec) allSpecializations.add(spec);
          });
        });

        // Convert to array and create service objects
        const categoryList = Array.from(allSpecializations).map((category) => ({
          icon: categoryIcons[category] || <Building2 className="w-8 h-8" />,
          title: category,
          description: `Professional ${category.toLowerCase()} services from verified providers.`,
        }));

        setCategories(categoryList.length > 0 ? categoryList : defaultServices);
      } catch (error) {
        console.error('Error fetching construction categories:', error);
        setCategories(defaultServices);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const services = categories.length > 0 ? categories : defaultServices;

  const features = [
    'Expert construction professionals',
    'Quality materials and craftsmanship',
    'Timely project completion',
    'Competitive pricing',
    'Free consultation and quotes',
    'Project management support',
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
              'url(https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/90 via-primary/85 to-primaryDark/90"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white drop-shadow-lg">
              Professional Construction Services
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto drop-shadow-md">
              Build your dream property with our expert construction and building services
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary hover:bg-primaryDark text-white border-primary"
                asChild
              >
                <Link to="/construction-list">
                  Browse Providers
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
                  <Link to="/construction-request">Request Service</Link>
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
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              Our Construction Services
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Comprehensive construction solutions for all your building needs
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-surface rounded-base shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-muted"
                >
                  <div className="text-primary mb-4">{service.icon}</div>
                  <h3 className="text-xl font-semibold text-textMain mb-2">{service.title}</h3>
                  <p className="text-textSecondary">{service.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-6">
                Why Choose Our Construction Services?
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
                Connect with our verified construction providers and get quotes for your
                construction project.
              </p>
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="bg-primary hover:bg-primaryDark text-white border-primary"
                  fullWidth
                  asChild
                >
                  <Link to="/construction-list">Browse Construction Providers</Link>
                </Button>
                {user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    fullWidth
                    asChild
                  >
                    <Link to="/construction-request">Submit Construction Request</Link>
                  </Button>
                )}
                {!user && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
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
              'url(https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primaryDark/95 via-primary/90 to-primaryDark/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white drop-shadow-lg">
            Ready to Build Your Dream Property?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Get in touch with our expert team and start your construction journey today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
                  className="bg-primary hover:bg-primaryDark text-white border-primary"
              asChild
            >
              <Link to="/construction-list">Find a Provider</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-surface text-textMain hover:bg-primary/10 border-card"
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

export default ConstructionServicesPage;
