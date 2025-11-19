import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Home,
  Building2,
  Wrench,
  Hammer,
  Users,
  Award,
  Heart,
  Target,
  CheckCircle,
} from 'lucide-react';

const About = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Hero Section with Background Image */}
      <div className="relative h-[70vh] bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-800/75 to-gray-900/80"></div>
        </div>
        <div className="relative flex flex-col items-center justify-center text-center px-4 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Home className="w-20 h-20 text-white mb-6 mx-auto drop-shadow-lg" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl sm:text-6xl font-display font-bold text-white mb-4 drop-shadow-lg"
          >
            About Aptify
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl sm:text-2xl text-gray-100 max-w-3xl mx-auto drop-shadow-md"
          >
            Your Trusted Partner in Real Estate, Renovation & Construction
          </motion.p>
        </div>
      </div>

      {/* Story Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
            Our Story
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-12">
            <div className="text-left">
              <p className="text-lg text-gray-700 font-inter mb-4 leading-relaxed">
                Aptify was founded with a vision to revolutionize the real estate experience in
                Pakistan. We recognized that finding the perfect property, managing renovations, and
                coordinating construction projects shouldn't be complicated or stressful.
              </p>
              <p className="text-lg text-gray-700 font-inter mb-4 leading-relaxed">
                Our platform brings together property buyers, sellers, renters, renovation experts,
                and construction professionals in one seamless ecosystem. We believe everyone
                deserves access to quality properties and professional services.
              </p>
              <p className="text-lg text-gray-700 font-inter leading-relaxed">
                Today, Aptify has become a trusted name in Pakistan's real estate market, helping
                thousands of people find their dream homes and transform their properties with
                confidence.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl bg-gray-200">
              <img
                src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                alt="Modern property interior"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </motion.div>

        {/* Mission & Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white shadow-xl rounded-xl p-8 hover:shadow-2xl transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                <Target className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Our Mission</h3>
            </div>
            <p className="text-gray-700 font-inter leading-relaxed">
              To empower individuals and families in Pakistan to find their perfect property and
              transform their spaces with confidence. We're committed to making real estate
              transactions, renovations, and construction projects accessible, transparent, and
              stress-free for everyone.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white shadow-xl rounded-xl p-8 hover:shadow-2xl transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                <Heart className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Our Values</h3>
            </div>
            <ul className="space-y-3 text-gray-700 font-inter">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Integrity:</strong> Honest, transparent dealings in every transaction
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Excellence:</strong> Quality service and professional standards
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Innovation:</strong> Leveraging technology to improve experiences
                </span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Services Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-8 text-center">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Home className="w-10 h-10" />,
                title: 'Property Listings',
                description:
                  'Browse thousands of properties for sale and rent. Find your perfect home with detailed listings, photos, and virtual tours.',
                image:
                  'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
              },
              {
                icon: <Wrench className="w-10 h-10" />,
                title: 'Renovation Services',
                description:
                  'Connect with verified renovation experts. Transform your property with professional renovation and remodeling services.',
                image:
                  'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
              },
              {
                icon: <Hammer className="w-10 h-10" />,
                title: 'Construction Services',
                description:
                  'Build your dream property from the ground up. Work with experienced construction professionals for new builds and extensions.',
                image:
                  'https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="h-48 overflow-hidden bg-gray-200">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="text-yellow-600 mb-3">{service.icon}</div>
                  <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 font-inter">{service.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Why Choose Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-8 md:p-12"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-8 text-center">
            Why Choose Aptify?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Verified Professionals',
                desc: 'All service providers are verified and experienced',
              },
              {
                icon: <Award className="w-8 h-8" />,
                title: 'Quality Assurance',
                desc: 'We maintain high standards for all listings and services',
              },
              {
                icon: <Building2 className="w-8 h-8" />,
                title: 'Wide Selection',
                desc: 'Thousands of properties and service providers to choose from',
              },
              {
                icon: <CheckCircle className="w-8 h-8" />,
                title: 'Easy Process',
                desc: 'Streamlined platform for seamless transactions',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-yellow-600 mb-4 flex justify-center">{feature.icon}</div>
                <h3 className="text-lg font-display font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 font-inter">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Ready to Find Your Dream Property?
            </h2>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have found their perfect home or transformed
              their property with Aptify.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/properties"
                  className="inline-block bg-white text-yellow-600 px-8 py-3 rounded-lg font-inter font-semibold hover:bg-yellow-50 transition-colors"
                >
                  Browse Properties
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/contact"
                  className="inline-block bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-inter font-semibold hover:bg-white hover:text-yellow-600 transition-colors"
                >
                  Contact Us
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default About;
