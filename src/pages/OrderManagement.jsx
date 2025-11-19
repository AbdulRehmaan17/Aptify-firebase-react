import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getOrders, updateOrderStatus, getUserProfile } from '../firebase/firestore';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const OrderManagement = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Please log in to access the admin panel.');
        navigate('/login');
        return;
      }

      const checkAdminAndFetchOrders = async () => {
        try {
          // Check if user is admin
          const userProfile = await getUserProfile(user.uid);
          console.log('User profile:', userProfile); // Debug log
          if (userProfile.role !== 'admin') {
            toast.error('Access denied. Admin privileges required.');
            navigate('/login');
            return;
          }
          setIsAdmin(true);

          // Fetch all orders
          const allOrders = await getOrders(); // No userId filter
          console.log('Orders fetched:', allOrders); // Debug log
          setOrders(allOrders);
        } catch (error) {
          console.error('Error fetching orders or profile:', error);
          toast.error('Failed to load orders.');
        } finally {
          setLoading(false);
        }
      };

      checkAdminAndFetchOrders();
    }
  }, [authLoading, user, navigate]);

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
      );
      toast.success(`Order status updated to ${newStatus}.`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'shipped':
        return 'bg-blue-100 text-blue-600';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-8 text-center">
          Order Management
        </h1>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-xl shadow-xl"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 font-inter mb-6">No orders have been placed yet.</p>
            <Button
              className="bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 px-8 shadow-lg"
              onClick={() => navigate('/admin')}
            >
              Back to Admin Panel
            </Button>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-inter font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-inter text-charcoal">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-inter text-charcoal">
                        {order.userId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-inter text-gray-500">
                        {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-inter text-charcoal">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-inter">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-inter">
                        <select
                          value={order.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="border border-gray-300 rounded-lg p-1 text-sm font-inter text-charcoal focus:ring-luxury-gold focus:border-luxury-gold"
                        >
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </motion.tr>
                    <AnimatePresence>
                      {expandedOrderId === order.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <h3 className="text-md font-display font-semibold text-charcoal">
                                Order Details
                              </h3>
                              {order.items.map((item) => (
                                <div
                                  key={item.productId}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center">
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="w-16 h-16 object-cover rounded-lg mr-4 shadow-sm"
                                    />
                                    <div>
                                      <p className="text-sm font-inter text-charcoal">
                                        {item.name}
                                      </p>
                                      <p className="text-sm text-gray-500 font-inter">
                                        Quantity: {item.quantity} | ${item.price.toFixed(2)} each
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-inter text-charcoal">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                              <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                                <span className="text-md font-display font-bold text-charcoal">
                                  Total
                                </span>
                                <span className="text-md font-display font-bold text-charcoal">
                                  ${order.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderManagement;
