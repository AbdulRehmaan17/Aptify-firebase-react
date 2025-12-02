import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const Cart = () => {
  const { items, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = (id, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-textSecondary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-textMain mb-4">Your cart is empty</h2>
          <p className="text-textSecondary mb-8">Discover our collection of luxury timepieces</p>
          <Button asChild>
            <Link to="/products">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-textMain mb-4">Shopping Cart</h1>
        <Link
          to="/products"
          className="inline-flex items-center text-accent hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-surface rounded-lg shadow-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Image */}
                <div className="w-full sm:w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={
                      item.image ||
                      'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=300'
                    }
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-textMain">{item.name}</h3>
                    {item.size && <p className="text-sm text-textSecondary">Size: {item.size}</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-textSecondary">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="p-1 border border-muted rounded hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="p-1 border border-muted rounded hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price and Remove */}
                    <div className="flex items-center justify-between sm:space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-textMain">
                          ${(item.price * item.quantity).toLocaleString()}
                        </p>
                        <p className="text-sm text-textSecondary">${item.price.toLocaleString()} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-error hover:bg-error rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={clearCart}
              variant="outline"
              size="sm"
              className="text-error border-error hover:bg-error"
            >
              Clear Cart
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-lg shadow-lg p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-textMain mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-textSecondary">Subtotal</span>
                <span className="text-textMain">${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Shipping</span>
                <span className="text-primary">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Tax</span>
                <span className="text-textMain">${Math.round(total * 0.08).toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-textMain">Total</span>
                <span className="text-textMain">${Math.round(total * 1.08).toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleCheckout} fullWidth size="lg">
              Proceed to Checkout
            </Button>

            <div className="mt-6 pt-6 border-t border-muted">
              <div className="flex items-center justify-center space-x-2 text-sm text-textSecondary">
                <span>🔒</span>
                <span>Secure checkout with 256-bit SSL encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
