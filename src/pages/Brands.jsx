import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrands } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const brandsData = await getBrands();
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast.error('Failed to load brands.');
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-ivory py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-8 text-center">
          Our Brands
        </h1>
        <p className="text-lg text-gray-600 font-inter mb-12 text-center">
          Discover the world’s finest luxury watch brands
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand, index) => (
            <Link to={`/brands/${brand.id}`} key={brand.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:bg-gradient-to-br hover:from-luxury-gold hover:to-yellow-600 hover:text-charcoal transition-all duration-300"
              >
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="w-full h-40 object-contain p-4 bg-ivory"
                  />
                )}
                <div className="p-6">
                  <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                    {brand.name}
                  </h2>
                  <p className="text-gray-600 font-inter text-sm line-clamp-2">
                    {brand.description || 'No description available.'}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Brands;
