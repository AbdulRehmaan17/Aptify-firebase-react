import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import userService from '../services/userService';
import propertyService from '../services/propertyService';
import marketplaceService from '../services/marketplaceService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please log in to view your wishlist.');
        navigate('/auth');
        return;
      }

      const fetchWishlist = async () => {
        try {
          setLoading(true);
          // Fetch user wishlist
          const wishlist = await userService.getWishlist(user.uid);

          if (wishlist.length === 0) {
            setWishlistItems([]);
            setLoading(false);
            return;
          }

          // Fetch details for each wishlist item
          const itemsPromises = wishlist.map(async (item) => {
            try {
              if (item.type === 'marketplace') {
                const listing = await marketplaceService.getById(item.id, false);
                return {
                  id: listing.id,
                  type: 'marketplace',
                  name: listing.title,
                  price: listing.price,
                  image: listing.coverImage || listing.images?.[0] || null,
                  location: listing.location,
                  link: `/buy-sell/listing/${listing.id}`,
                };
              } else {
                // Property
                const property = await propertyService.getById(item.id, false);
                return {
                  id: property.id,
                  type: 'property',
                  name: property.title,
                  price: property.price,
                  image: property.coverImage || property.photos?.[0] || null,
                  location: property.address?.city || property.address?.line1 || 'Location not specified',
                  link: `/properties/${property.id}`,
                };
              }
            } catch (error) {
              console.error(`Error fetching item ${item.id}:`, error);
              return null;
            }
          });

          const items = await Promise.all(itemsPromises);
          setWishlistItems(items.filter((item) => item !== null));
        } catch (error) {
          console.error('Error fetching wishlist:', error);
          toast.error('Failed to load wishlist.');
        } finally {
          setLoading(false);
        }
      };

      fetchWishlist();
    }
  }, [authLoading, user, navigate]);

  const handleRemoveFromWishlist = async (itemId) => {
    try {
      await userService.removeFromWishlist(user.uid, itemId);
      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success('Item removed from wishlist.');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove item from wishlist.');
    }
  };

  const handleAddToCart = (item) => {
    if (!user) {
      toast.error('Please log in to add items to cart.');
      navigate('/auth');
      return;
    }

    try {
      addToCart({
        itemId: item.id,
        itemType: item.type,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-error" />
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-textMain">
            Your Wishlist
          </h1>
          {wishlistItems.length > 0 && (
            <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-semibold">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 card-base"
          >
            <Heart className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-xl text-textSecondary font-inter mb-6">Your wishlist is empty.</p>
            <div className="flex gap-4 justify-center">
              <Button
                className="bg-primary text-white hover:bg-primaryDark"
                onClick={() => navigate('/buy')}
              >
                Browse Marketplace
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/properties')}
              >
                Browse Properties
              </Button>
            </div>
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
                  whileHover={{ scale: 1.02 }}
                  className="card-base p-4 hover:shadow-2xl transition-shadow duration-300"
                >
                  <Link to={item.link}>
                    <img
                      src={item.image || 'https://via.placeholder.com/400x300?text=No+Image'}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-lg mb-4 cursor-pointer"
                    />
                  </Link>
                  <div className="mb-2">
                    <Link to={item.link}>
                      <h3 className="text-lg font-display font-semibold text-textMain mb-2 hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <div className="flex items-center text-textSecondary text-sm mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <p className="text-primary font-bold text-xl">{formatPrice(item.price)}</p>
                    <span className="text-xs text-textSecondary capitalize">
                      {item.type === 'marketplace' ? 'Marketplace Item' : 'Property'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 text-primary border-primary hover:bg-primary hover:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(item);
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      className="text-error border-error hover:bg-error hover:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFromWishlist(item.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
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
