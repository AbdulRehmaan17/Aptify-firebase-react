import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProduct, getReviews } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const fetchProductData = async () => {
    try {
      const productData = await getProduct(id);
      let reviewsData = [];
      try {
        reviewsData = await getReviews(id);
      } catch (reviewsError) {
        if (reviewsError.message.includes('permission-denied')) {
          console.warn('Reviews fetch failed due to permissions:', reviewsError);
        } else {
          throw reviewsError;
        }
      }

      setProduct({
        ...productData,
        imageUrl: productData.imageUrl
          ? `${productData.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_1200,h_1200,c_fill/')}`
          : 'https://res.cloudinary.com/dba3tysex/image/upload/v1/watch-images/placeholder.jpg',
      });
      setReviews(reviewsData);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(
        err.message.includes('permission-denied')
          ? 'Access denied. Please log in to view this product.'
          : 'Failed to load product details.'
      );
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProductData();
    }
  }, [id, authLoading]);

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please log in to add items to your cart.');
      navigate('/login');
      return;
    }
    if (product.stock === 0) {
      toast.error('This product is out of stock.');
      return;
    }
    addToCart({
      productId: id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
      size: 'default', // No size selection for watches
    });
    navigate('/cart');
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-error mb-4 font-inter text-lg">{error}</p>
          {error.includes('log in') && (
            <Button onClick={() => navigate('/login')} variant="primary">
              Log In
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <p className="text-charcoal font-inter text-lg">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16"
      >
        {/* Product Image */}
        <div className="relative group">
          <motion.img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-[500px] sm:h-[600px] object-cover rounded-lg shadow-2xl transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            whileHover={{ scale: 1.1 }}
          />
          <button
            onClick={() => setIsImageZoomed(true)}
            className="absolute top-4 right-4 p-2 bg-charcoal bg-opacity-50 rounded-full text-ivory hover:bg-luxury-gold transition-colors duration-300"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {isImageZoomed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-charcoal bg-opacity-90 z-50 flex items-center justify-center"
                onClick={() => setIsImageZoomed(false)}
              >
                <motion.img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-w-[90%] max-h-[90%] object-contain"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Product Details */}
        <motion.div
          className="lg:sticky lg:top-24 flex flex-col justify-between"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-3 tracking-tight">
              {product.name}
            </h1>
            <p className="text-xl text-textSecondary font-inter mb-6 uppercase tracking-wider">
              {product.brand}
            </p>
            <div className="flex items-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-6 h-6 ${i < Math.round(product.rating) ? 'text-accent fill-current' : 'text-muted'}`}
                />
              ))}
              <span className="ml-3 text-sm text-textSecondary font-inter">
                ({product.rating.toFixed(1)} • {reviews.length} reviews)
              </span>
            </div>
            <p className="text-3xl font-bold text-charcoal mb-6 font-inter">
              ${product.price.toFixed(2)}
            </p>
            <p className="text-textSecondary mb-8 font-inter leading-relaxed">{product.description}</p>
            <div className="flex items-center space-x-4 mb-8">
              <span
                className={`text-sm font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-error'}`}
              >
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-64"
          >
            <Button
              className="w-full bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 shadow-lg"
              disabled={product.stock === 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-6 h-6 mr-3" />
              {product.stock > 0 ? 'Add to Cart' : 'Notify Me'}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Reviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-16 bg-surface rounded-lg shadow-xl p-8"
      >
        <h2 className="text-3xl font-display font-bold text-charcoal mb-8">Customer Reviews</h2>
        <div className="flex items-center mb-8">
          <span className="text-4xl font-bold text-charcoal mr-4">{averageRating}</span>
          <div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-accent fill-current' : 'text-muted'}`}
                />
              ))}
            </div>
            <span className="text-sm text-textSecondary font-inter">
              Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-b border-muted pb-6"
              >
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < review.rating ? 'text-accent fill-current' : 'text-muted'}`}
                    />
                  ))}
                </div>
                <p className="text-textSecondary mb-3 font-inter leading-relaxed">{review.comment}</p>
                <p className="text-sm text-textSecondary font-inter">
                  By {review.userName || 'Anonymous'} •{' '}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-textSecondary font-inter">No reviews yet.</p>
        )}
        <div className="mt-8">
          {user ? (
            <Button
              className="bg-charcoal text-ivory hover:bg-luxury-gold hover:text-charcoal transition-colors duration-300 font-inter"
              variant="outline"
              onClick={() => toast.info('Write a review functionality coming soon!')}
            >
              Write a Review
            </Button>
          ) : (
            <p className="text-textSecondary font-inter">
              <button
                className="text-accent hover:underline font-medium"
                onClick={() => navigate('/login')}
              >
                Log in
              </button>{' '}
              to write a review.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetail;
