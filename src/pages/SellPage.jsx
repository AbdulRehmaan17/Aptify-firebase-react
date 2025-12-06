import React from 'react';
import { Link } from 'react-router-dom';
import { Home, DollarSign, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

/**
 * SellPage Component
 *
 * Landing page for property sellers.
 * Provides information about selling properties and links to post property form.
 */
const SellPage = () => {
  const { user } = useAuth();

  const benefits = [
    'Wide exposure to potential buyers',
    'Professional property listing',
    'High-quality images and descriptions',
    'Easy property management',
    'Direct communication with buyers',
    'Secure transaction process',
  ];

  const steps = [
    {
      number: '1',
      title: 'Create Your Listing',
      description: 'Fill out the property form with all details and upload images.',
    },
    {
      number: '2',
      title: 'Get Verified',
      description: 'Our team reviews and verifies your property listing.',
    },
    {
      number: '3',
      title: 'Go Live',
      description: 'Your property is published and visible to all buyers.',
    },
    {
      number: '4',
      title: 'Connect with Buyers',
      description: 'Receive inquiries and communicate directly with interested buyers.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primaryDark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Sell Your Property with Aptify
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
              Reach thousands of potential buyers and sell your property quickly and easily
            </p>
            {user ? (
              <Button size="lg" variant="secondary" asChild>
                <Link to="/post-property">
                  List Your Property
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/auth">Sign Up to List Property</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-surface text-primary hover:bg-primary/10"
                  asChild
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              Why Sell with Aptify?
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Get the best exposure for your property and connect with serious buyers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <CheckCircle className="w-6 h-6 text-primary mb-3" />
                <p className="text-lg font-medium text-textMain">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-textMain mb-4">
              How It Works
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Sell your property in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-background rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-textMain mb-2">{step.title}</h3>
                <p className="text-textSecondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to Sell Your Property?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of property owners who trust Aptify to sell their properties
          </p>
          {user ? (
            <Button size="lg" variant="secondary" asChild>
              <Link to="/post-property">
                List Your Property Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/auth">Sign Up Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-surface text-primary hover:bg-primary/10"
                asChild
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SellPage;
