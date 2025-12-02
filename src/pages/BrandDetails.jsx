import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBrand, getCollections, getProducts } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';

const BrandDetail = () => {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [collections, setCollections] = useState([]);
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [brandData, collectionsData, productsData] = await Promise.all([
          getBrand(id),
          getCollections(),
          getProducts(),
        ]);
        setBrand(brandData);
        setCollections(collectionsData.filter((c) => c.brandId === id));
        setWatches(productsData.filter((p) => p.brandId === id));
      } catch (error) {
        console.error('Error fetching brand data:', error);
        toast.error('Failed to load brand details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-charcoal font-inter text-lg">Brand not found.</p>
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
        <div className="bg-surface shadow-xl rounded-lg p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center">
            {brand.logoUrl && (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="w-48 h-48 object-contain mb-6 md:mb-0 md:mr-8"
              />
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-charcoal mb-4">
                {brand.name}
              </h1>
              <p className="text-textSecondary font-inter text-lg">
                {brand.description || 'No description available.'}
              </p>
            </div>
          </div>
        </div>

        {collections.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Collections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection, index) => (
                <Link to={`/collections/${collection.id}`} key={collection.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-surface rounded-lg shadow-lg p-6 hover:bg-gradient-to-br hover:from-luxury-gold hover:to-yellow-600 hover:text-charcoal"
                  >
                    <h3 className="text-xl font-display font-bold text-charcoal mb-2">
                      {collection.name}
                    </h3>
                    <p className="text-textSecondary font-inter text-sm line-clamp-2">
                      {collection.description || 'No description available.'}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {watches.length > 0 && (
          <div>
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">Watches</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {watches.map((watch, index) => (
                <Link to={`/products/${watch.id}`} key={watch.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-surface rounded-lg shadow-lg overflow-hidden hover:bg-gradient-to-br hover:from-luxury-gold hover:to-yellow-600 hover:text-charcoal"
                  >
                    {watch.imageUrl && (
                      <img
                        src={watch.imageUrl}
                        alt={watch.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-display font-bold text-charcoal mb-2">
                        {watch.name}
                      </h3>
                      <p className="text-textSecondary font-inter text-sm mb-2">
                        ${watch.price.toFixed(2)}
                      </p>
                      <p className="text-textSecondary font-inter text-sm line-clamp-2">
                        {watch.description || 'No description available.'}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BrandDetail;
