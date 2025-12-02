import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCollection, getBrands, getProducts } from '../firebase/firestore';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CollectionDetail = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [brand, setBrand] = useState(null);
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [collectionData, brandsData, productsData] = await Promise.all([
          getCollection(id),
          getBrands(),
          getProducts(),
        ]);
        setCollection(collectionData);
        setBrand(brandsData.find((b) => b.id === collectionData.brandId) || null);
        setWatches(productsData.filter((p) => p.collectionId === id));
      } catch (error) {
        console.error('Error fetching collection data:', error);
        toast.error('Failed to load collection details.');
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

  if (!collection) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-charcoal font-inter text-lg">Collection not found.</p>
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
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-charcoal mb-4">
            {collection.name}
          </h1>
          {brand && (
            <Link
              to={`/brands/${brand.id}`}
              className="text-accent hover:text-accent font-inter text-lg mb-4 inline-block"
            >
              {brand.name}
            </Link>
          )}
          <p className="text-textSecondary font-inter text-lg">
            {collection.description || 'No description available.'}
          </p>
        </div>

        {watches.length > 0 && (
          <div>
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
              Watches in this Collection
            </h2>
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

export default CollectionDetail;
