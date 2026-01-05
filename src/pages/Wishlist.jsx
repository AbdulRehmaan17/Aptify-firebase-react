import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, removeFromWishlist, getProducts } from '../firebase/firestore';
// Note: These functions are exported from firestore.js, not from centralized firebase.js
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please log in to view your wishlist.');
        navigate('/login');
        return;
      }

      const fetchWishlist = async () => {
        try {
          // Fetch user profile to get wishlist array
          const userProfile = await getUserProfile(user.uid);
          if (import.meta.env.DEV) {
            console.log('User profile fetched:', userProfile);
          }
          const wishlistIds = userProfile.wishlist || [];

          if (wishlistIds.length === 0) {
            setWishlistItems([]);
            setLoading(false);
            return;
          }

          // Fetch product details for wishlist items
          const products = await getProducts({ productIds: wishlistIds });
          if (import.meta.env.DEV) {
            console.log('Wishlist products fetched:', products);
          }
          setWishlistItems(products);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error fetching wishlist:', error);
          }
          toast.error('Failed to load wishlist.');
        } finally {
          setLoading(false);
        }
      };

      fetchWishlist();
    }
  }, [authLoading, user, navigate]);

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(user.uid, productId);
      setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
      toast.success('Item removed from wishlist.');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error removing from wishlist:', error);
      }
      toast.error('Failed to remove item from wishlist.');
    }
  };

  const handleAddToCart = (product) => {
    // Placeholder for cart integration
    toast.info(`Added ${product.name} to cart! (Cart functionality coming soon)`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-8 text-center">
          Your Wishlist
        </h1>

        {wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 card-base"
          >
            <Heart className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-xl text-textSecondary font-inter mb-6">Your wishlist is empty.</p>
            <Button
              className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 px-8 shadow-lg"
              onClick={() => navigate('/products')}
            >
              Browse Products
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {wishlistItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="card-base p-4 hover:shadow-2xl transition-shadow duration-300"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onClick={() => navigate(`/products/${item.id}`)}
                  />
                  <h3 className="text-lg font-display font-semibold text-charcoal mb-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-textSecondary font-inter mb-2">${item.price.toFixed(2)}</p>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter text-sm py-2"
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-error border-error hover:bg-error hover:text-error font-inter text-sm py-2"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Wishlist;
