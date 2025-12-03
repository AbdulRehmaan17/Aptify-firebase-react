import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const Cart = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, total, itemCount, removeFromCart, updateQuantity, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please log in to checkout.');
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    setLoading(true);
    try {
      // Create order
      const orderData = {
        userId: user.uid,
        items: items.map((item) => ({
          itemId: item.itemId || item.productId,
          itemType: item.itemType || 'marketplace',
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          sellerId: item.sellerId || null,
        })),
        total: total,
        currency: 'PKR',
        paymentStatus: 'pending',
      };

      const orderId = await orderService.create(orderData);

      // Clear cart
      clearCart();

      // Navigate to payment page
      navigate(`/payment?amount=${total}&targetType=order&targetId=${orderId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-error mb-4 font-inter text-lg">Please log in to view your cart.</p>
          <Button onClick={() => navigate('/auth')} variant="primary">
            Go to Login
          </Button>
        </motion.div>
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
          <ShoppingCart className="w-8 h-8 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-textMain">
            Shopping Cart
          </h1>
          {itemCount > 0 && (
            <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-semibold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 card-base"
          >
            <ShoppingCart className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-xl text-textSecondary font-inter mb-6">Your cart is empty.</p>
            <Button
              className="bg-primary text-white hover:bg-primaryDark"
              onClick={() => navigate('/buy')}
            >
              Browse Marketplace
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="card-base p-4 flex gap-4"
                  >
                    {/* Item Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.image || 'https://via.placeholder.com/150?text=No+Image'}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                        onClick={() => {
                          const itemId = item.itemId || item.productId;
                          const itemType = item.itemType || 'marketplace';
                          if (itemType === 'marketplace') {
                            navigate(`/buy-sell/listing/${itemId}`);
                          } else {
                            navigate(`/properties/${itemId}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-textMain mb-2">{item.name}</h3>
                      <p className="text-primary font-bold text-xl mb-3">
                        {formatPrice(item.price)}
                      </p>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-textSecondary">Quantity:</span>
                        <div className="flex items-center gap-2 border border-muted rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-muted transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 py-1 min-w-[3rem] text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-muted transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm text-textSecondary">
                          = {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <p className="text-sm text-textSecondary mt-auto">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Clear Cart Button */}
              {items.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="text-error border-error hover:bg-error/10"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear your cart?')) {
                        clearCart();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card-base p-6 sticky top-4">
                <h2 className="text-2xl font-display font-bold text-textMain mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-textSecondary">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-textSecondary">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t border-muted pt-4">
                    <div className="flex justify-between text-lg font-bold text-textMain">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary text-white hover:bg-primaryDark mb-4"
                  onClick={handleCheckout}
                  loading={loading}
                  disabled={loading || items.length === 0}
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/buy')}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Cart;

