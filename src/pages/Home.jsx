import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, HeadphonesIcon, Star, Clock } from 'lucide-react';
import propertyService from '../services/propertyService';
import PropertyCard from '../components/property/PropertyCard';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { runDiagnostics, printDiagnostics } from '../utils/firebaseDiagnostics';
import subscriptionService from '../services/subscriptionService';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Demo properties to display when no real properties are available
  const getDemoProperties = () => [
    {
      id: 'demo-1',
      title: 'Luxury 3-Bedroom Apartment',
      price: 85000,
      type: 'rent',
      status: 'published',
      address: 'DHA Phase 5, Karachi',
      city: 'Karachi',
      bedrooms: 3,
      bathrooms: 2,
      areaSqFt: 1800,
      photos: ['https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
    {
      id: 'demo-2',
      title: 'Modern 4-Bedroom Villa',
      price: 25000000,
      type: 'sale',
      status: 'published',
      address: 'Gulberg, Lahore',
      city: 'Lahore',
      bedrooms: 4,
      bathrooms: 3,
      areaSqFt: 3200,
      photos: ['https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
    {
      id: 'demo-3',
      title: 'Cozy 2-Bedroom Flat',
      price: 45000,
      type: 'rent',
      status: 'published',
      address: 'Clifton, Karachi',
      city: 'Karachi',
      bedrooms: 2,
      bathrooms: 1,
      areaSqFt: 1200,
      photos: ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
    {
      id: 'demo-4',
      title: 'Spacious 5-Bedroom House',
      price: 35000000,
      type: 'sale',
      status: 'published',
      address: 'Islamabad',
      city: 'Islamabad',
      bedrooms: 5,
      bathrooms: 4,
      areaSqFt: 4500,
      photos: ['https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
    {
      id: 'demo-5',
      title: 'Elegant 3-Bedroom Penthouse',
      price: 120000,
      type: 'rent',
      status: 'published',
      address: 'Bahria Town, Karachi',
      city: 'Karachi',
      bedrooms: 3,
      bathrooms: 2,
      areaSqFt: 2200,
      photos: ['https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
    {
      id: 'demo-6',
      title: 'Family-Friendly 4-Bedroom Home',
      price: 18000000,
      type: 'sale',
      status: 'published',
      address: 'Model Town, Lahore',
      city: 'Lahore',
      bedrooms: 4,
      bathrooms: 3,
      areaSqFt: 2800,
      photos: ['https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800'],
      featured: true,
    },
  ];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Debug: Check Firebase initialization
        const { db } = await import('../firebase');
        if (!db) {
          console.error('❌ Firestore db is not initialized!');
          toast.error('Firebase is not configured. Please check your environment variables.');
          const demoProperties = getDemoProperties();
          setFeaturedProducts(demoProperties);
          setNewArrivals(demoProperties.slice(0, 6));
          setLoading(false);
          return;
        }
        
        console.log('✅ Firestore db is initialized, fetching properties...');
        
        // Fetch featured properties (properties with featured: true)
        const featured = await propertyService.getAll(
            { featured: true, status: 'published' },
            { sortBy: 'createdAt', sortOrder: 'desc', limit: 6 }
        );
        
        console.log(`📊 Featured properties fetched: ${featured.length}`);

        // If no featured properties, fallback to latest published properties
        let featuredProperties = featured;
        if (featured.length === 0) {
          console.log('No featured properties found, trying latest properties...');
          featuredProperties = await propertyService.getAll(
            { status: 'published' },
            { sortBy: 'createdAt', sortOrder: 'desc', limit: 6 }
          );
          console.log(`📊 Latest properties fetched: ${featuredProperties.length}`);
        }

        // If still no properties, use demo properties
        if (featuredProperties.length === 0) {
          console.warn('⚠️ No properties found in Firestore, displaying demo properties');
          console.warn('   Possible issues:');
          console.warn('   1. Firestore collection is empty');
          console.warn('   2. Firestore security rules are blocking access');
          console.warn('   3. Properties are not published (status !== "published")');
          featuredProperties = getDemoProperties();
        }

        // Fetch latest properties for "Latest Listings" section
        const newProperties = await propertyService.getAll(
          { status: 'published' },
          { sortBy: 'createdAt', sortOrder: 'desc', limit: 6 }
        );
        
        console.log(`📊 New properties fetched: ${newProperties.length}`);

        // If no new properties, use demo properties (different set)
        const displayNewProperties = newProperties.length > 0 
          ? newProperties 
          : getDemoProperties().slice(0, 6);

        setFeaturedProducts(featuredProperties);
        setNewArrivals(displayNewProperties);
      } catch (error) {
        console.error('❌ Error fetching properties:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
        });
        
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Please check Firestore security rules.');
        } else if (error.code === 'failed-precondition') {
          toast.error('Firestore index required. Please create the index in Firebase Console.');
        } else {
          toast.error(`Failed to load properties: ${error.message || 'Unknown error'}`);
        }
        
        // On error, show demo properties
        const demoProperties = getDemoProperties();
        setFeaturedProducts(demoProperties);
        setNewArrivals(demoProperties.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="Aptify Properties"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50" />
        </div>

        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 animate-fade-in">
            Find Your
            <span className="text-primary block">Dream Property</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 animate-slide-up">
            Discover the perfect rental or purchase property, with expert renovation services
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button size="lg" asChild>
              <Link to="/properties">
                Browse Properties
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/services">Renovation Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto break-words">
            Hand-selected properties that represent the best in real estate, available for rent or
            purchase
          </p>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textSecondary mb-4">No featured properties available at the moment.</p>
            <Button variant="outline" asChild>
              <Link to="/properties">Browse All Properties</Link>
            </Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProducts.map((property) => (
              <PropertyCard key={property.id} property={property} />
          ))}
        </div>
        )}

        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link to="/properties">
              View All Properties
              <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Brand Story */}
      <section className="bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-6">
                Your Trusted Real Estate Partner
              </h2>
              <p className="text-lg text-textSecondary mb-6 leading-relaxed">
                Aptify has been connecting property seekers with their perfect homes and rental
                properties. Our platform features verified listings from trusted owners, with
                detailed information and high-quality images to help you make informed decisions.
              </p>
              <p className="text-lg text-textSecondary mb-8 leading-relaxed">
                Every property on our platform is verified by our team, and we also offer
                professional renovation services to transform your property into your dream space.
              </p>
              <Button variant="primary" size="lg" asChild>
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Property renovation"
                className="rounded-base shadow-lg"
              />
              <div className="absolute -bottom-6 -left-6 bg-surface p-6 rounded-base shadow-md border border-muted">
                <div className="flex items-center space-x-3">
                  <Clock className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold text-textMain">1000+</p>
                    <p className="text-sm text-textSecondary">Properties Listed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
            Latest Listings
          </h2>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            The newest properties added to our platform
          </p>
        </div>

        {newArrivals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textSecondary">No properties available at the moment.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newArrivals.map((property) => (
              <PropertyCard key={property.id} property={property} />
          ))}
        </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              The Aptify Promise
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Your property journey, simplified and trusted
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-2">Verified Properties</h3>
              <p className="text-textSecondary">Every property is verified by our expert team</p>
            </div>

            <div className="text-center group">
              <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                <Truck className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-2">Renovation Services</h3>
              <p className="text-textSecondary">
                Professional renovation services for all property types
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                <HeadphonesIcon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-2">Expert Support</h3>
              <p className="text-textSecondary">
                Dedicated support team to help with your property needs
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                <Star className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-2">Secure Transactions</h3>
              <p className="text-textSecondary">Safe and secure property transactions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primaryDark py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Subscribe to receive updates on new property listings, renovation service offers, and
            real estate insights
          </p>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              
              // PHASE 4: Validate input
              if (!newsletterEmail.trim()) {
                toast.error('Please enter your email address');
                return;
              }

              // PHASE 4: Set loading state
              setIsSubscribing(true);
              try {
                // PHASE 2: Pass source parameter to track subscription origin
                const result = await subscriptionService.subscribe(newsletterEmail, 'home');
                
                if (result.success) {
                  // PHASE 4: Show real success only after backend confirms
                  toast.success(result.message || 'Successfully subscribed! Please check your email for confirmation.');
                  setNewsletterEmail('');
                } else {
                  // PHASE 4: Handle specific error cases
                  toast.error(result.message || 'Failed to subscribe');
                }
              } catch (error) {
                console.error('Subscription error:', error);
                // PHASE 4: Handle network failures
                toast.error('Failed to subscribe. Please check your connection and try again.');
              } finally {
                setIsSubscribing(false);
              }
            }}
            className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isSubscribing}
              className="flex-1 px-4 py-3 rounded-base border border-white/20 bg-surface/10 text-white placeholder-white/60 focus:ring-2 focus:ring-white focus:border-white disabled:opacity-50"
            />
            <Button 
              type="submit" 
              size="lg" 
              variant="secondary"
              disabled={isSubscribing}
            >
              {isSubscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Home;
