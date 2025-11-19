import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder, getUserProfile } from '../firebase/firestore';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, total, itemCount, updateQuantity, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      console.log('Auth state:', { user }); // Debug log
      if (!user || !user.uid) {
        toast.error('Please log in to proceed with checkout.');
        navigate('/login');
      } else {
        const fetchUserProfile = async () => {
          try {
            const profile = await getUserProfile(user.uid);
            console.log('User profile fetched:', profile); // Debug log
            setUserProfile(profile);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            toast.error('Failed to load user profile.');
          } finally {
            setLoading(false);
          }
        };
        fetchUserProfile();
      }
    }
  }, [authLoading, user, navigate]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (!user || !user.uid) {
      toast.error('You must be logged in to place an order.');
      navigate('/login');
      return;
    }

    try {
      const orderData = {
        userId: user.uid,
        items: items.map((item) => ({
          productId: item.productId || item.id,
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || '',
        })),
        total: total || 0,
        email: user.email || '',
        status: 'pending',
      };

      console.log('Order Data:', JSON.stringify(orderData, null, 2)); // Debug log

      // Save order to Firestore
      const orderId = await createOrder(orderData);

      toast.success(`Order #${orderId} placed successfully!`);
      clearCart();
      navigate('/cart', { state: { orderId, orderData } });
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  const handleQuantityChange = (id, quantity) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    updateQuantity(id, quantity);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-charcoal text-ivory min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ivory mb-6 text-center">
          Checkout Details
        </h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-ivory font-inter mb-6">
              Your cart is empty, please add items to continue.
            </p>
            <Button
              className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 px-8 shadow-lg"
              onClick={() => navigate('/products')}
            >
              Shop Now
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <motion.div
                className="bg-charcoal rounded-xl shadow-xl p-6"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h2 className="text-2xl font-display font-bold text-ivory mb-6">
                  Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </h2>
                <div className="space-y-6">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center border-b border-gray-700 pb-6"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg mr-4 shadow-md"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-semibold text-ivory">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-400 font-inter">
                          ${item.price.toFixed(2)} each
                        </p>
                        <div className="flex items-center mt-2">
                          <label htmlFor={`quantity - ${item.id} `} className="sr-only">
                            Quantity
                          </label>
                          <select
                            id={`quantity - ${item.id} `}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(item.id, parseInt(e.target.value))
                            }
                            className="border border-gray-700 rounded-md text-ivory bg-charcoal font-inter text-sm px-2 py-1 focus:ring-luxury-gold focus:border-luxury-gold"
                          >
                            {[...Array(10).keys()].map((n) => (
                              <option key={n + 1} value={n + 1}>
                                {n + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-4 text-red-400 hover:text-red-600 transition-colors duration-300"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-lg font-inter font-medium text-ivory">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <motion.div
                className="bg-charcoal rounded-xl shadow-xl p-6 sticky top-24"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <h2 className="text-2xl font-display font-bold text-ivory mb-6">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-inter">Subtotal</span>
                    <span className="text-ivory font-inter font-medium">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-inter">Shipping</span>
                    <span className="text-ivory font-inter font-medium">TBD</span>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between">
                      <span className="text-lg font-display font-bold text-ivory">Total</span>
                      <span className="text-lg font-display font-bold text-ivory">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-6"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 shadow-lg"
                    onClick={handlePlaceOrder}
                  >
                    Place Order
                  </Button>
                </motion.div>
                <Button
                  className="w-full mt-4 bg-charcoal text-ivory hover:bg-luxury-gold hover:text-charcoal transition-colors duration-300 font-inter border border-ivory"
                  variant="outline"
                  onClick={() => navigate('/products')}
                >
                  Continue Shopping
                </Button>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Checkout;
