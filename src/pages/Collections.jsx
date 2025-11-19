import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCollections, getBrands } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [collectionsData, brandsData] = await Promise.all([getCollections(), getBrands()]);
        setCollections(collectionsData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to load collections.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

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
          Our Collections
        </h1>
        <p className="text-lg text-gray-600 font-inter mb-12 text-center">
          Explore curated collections from the finest watchmakers
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection, index) => (
            <Link to={`/collections/${collection.id}`} key={collection.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                className="bg-white rounded-xl shadow-lg p-6 hover:bg-gradient-to-br hover:from-luxury-gold hover:to-yellow-600 hover:text-charcoal transition-all duration-300"
              >
                <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                  {collection.name}
                </h2>
                <p className="text-gray-600 font-inter text-sm mb-2">
                  {getBrandName(collection.brandId)}
                </p>
                <p className="text-gray-600 font-inter text-sm line-clamp-2">
                  {collection.description || 'No description available.'}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Collections;
