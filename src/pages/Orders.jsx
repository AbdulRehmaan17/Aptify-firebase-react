import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../firebase/firestore';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please log in to view your order history.');
        navigate('/login');
        return;
      }

      const fetchOrders = async () => {
        try {
          const userOrders = await getOrders(user.uid);
          console.log('Orders fetched:', userOrders); // Debug log
          setOrders(userOrders);
          setFilteredOrders(userOrders);
        } catch (error) {
          console.error('Error fetching orders:', error);
          toast.error('Failed to load order history.');
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    // Filter orders based on status and search query
    let filtered = orders;
    if (statusFilter !== 'all') {
      filtered = orders.filter((order) => order.status.toLowerCase() === statusFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          new Date(order.createdAt.seconds * 1000)
            .toLocaleDateString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }
    setFilteredOrders(filtered);
  }, [statusFilter, searchQuery, orders]);

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusTooltip = (status) => {
    switch (status) {
      case 'pending':
        return 'Order is being processed';
      case 'shipped':
        return 'Order has been shipped';
      case 'delivered':
        return 'Order has been delivered';
      case 'cancelled':
        return 'Order was cancelled';
      default:
        return '';
    }
  };

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

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
          Your Order History
        </h1>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg font-inter text-sm text-charcoal focus:ring-luxury-gold focus:border-luxury-gold"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={statusFilter === filter.id ? 'solid' : 'outline'}
                className={`px-4 py-2 text-sm font-inter ${
                  statusFilter === filter.id
                    ? 'bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal'
                    : 'bg-white text-charcoal border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-xl shadow-xl"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 font-inter mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders match your search or filter.'
                : "You haven't placed any orders yet."}
            </p>
            <Button
              className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 px-8 shadow-lg"
              onClick={() => navigate('/products')}
            >
              Explore Our Collection
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300 border border-gray-100"
              >
                <div
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className="relative" title={getStatusTooltip(order.status)}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="ml-4">
                      <h2 className="text-lg font-display font-semibold text-charcoal">
                        Order #{order.id.slice(0, 8)}...
                      </h2>
                      <p className="text-sm text-gray-500 font-inter">
                        Placed on {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-charcoal">
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </p>
                      <p className="text-lg font-inter font-medium text-charcoal">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedOrderId === order.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="w-5 h-5 text-charcoal" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-charcoal" />
                      )}
                    </motion.div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 border-t border-gray-200 pt-4"
                    >
                      <h3 className="text-md font-display font-semibold text-charcoal mb-4">
                        Order Details
                      </h3>
                      <div className="grid gap-4">
                        {order.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                          >
                            <div className="flex items-center">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg mr-4 shadow-sm"
                              />
                              <div>
                                <p className="text-sm font-inter font-medium text-charcoal">
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-500 font-inter">
                                  Quantity: {item.quantity} | ${item.price.toFixed(2)} each
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-inter font-medium text-charcoal">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                        <span className="text-md font-display font-bold text-charcoal">Total</span>
                        <span className="text-md font-display font-bold text-charcoal">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-end gap-4">
                        {order.status === 'shipped' && (
                          <Button
                            variant="outline"
                            className="text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter"
                            onClick={() => toast.info('Tracking functionality coming soon!')}
                          >
                            Track Order
                          </Button>
                        )}
                        <Button
                          className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold font-inter"
                          onClick={() => navigate('/products')}
                        >
                          Shop More
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderHistory;
