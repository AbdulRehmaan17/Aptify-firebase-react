import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import notificationService from './notificationService';

const ORDERS_COLLECTION = 'orders';

/**
 * Order Service Class
 * Handles order creation and management
 */
class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @param {string} orderData.userId - User ID
   * @param {Array} orderData.items - Array of order items
   * @param {number} orderData.total - Total amount
   * @param {string} orderData.currency - Currency (default: PKR)
   * @returns {Promise<string>} - Order document ID
   */
  async create(orderData) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Validate required fields
      const requiredFields = ['userId', 'items', 'total'];
      const missingFields = requiredFields.filter((field) => !orderData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate items array
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Items array is required and must not be empty');
      }

      // Validate each item
      orderData.items.forEach((item, index) => {
        if (!item.itemId || !item.itemType || item.quantity === undefined || item.price === undefined) {
          throw new Error(`Invalid item at index ${index}: missing required fields`);
        }
        if (item.quantity <= 0) {
          throw new Error(`Invalid item at index ${index}: quantity must be greater than 0`);
        }
      });

      // Generate order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order document
      const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), {
        orderId,
        userId: orderData.userId,
        items: orderData.items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType, // 'marketplace' or 'property'
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          image: item.image || null,
          sellerId: item.sellerId || null,
        })),
        total: Number(orderData.total),
        currency: orderData.currency || 'PKR',
        status: 'pending', // 'pending', 'processing', 'completed', 'cancelled'
        shippingAddress: orderData.shippingAddress || null,
        paymentMethod: orderData.paymentMethod || null,
        paymentStatus: orderData.paymentStatus || 'pending', // 'pending', 'paid', 'failed'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send notification to user
      try {
        await notificationService.create(
          orderData.userId,
          'Order Placed',
          `Your order #${orderId} has been placed successfully. Total: ${orderData.currency || 'PKR'} ${orderData.total.toLocaleString()}`,
          'success',
          `/orders/${orderRef.id}`
        );
      } catch (notifError) {
        console.error('Error sending order notification:', notifError);
        // Don't throw - notification failure shouldn't break order creation
      }

      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(error.message || 'Failed to create order');
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order document ID
   * @returns {Promise<Object>} - Order data
   */
  async getById(orderId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!orderId) throw new Error('Order ID is required');

      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }

      return {
        id: orderSnap.id,
        ...orderSnap.data(),
      };
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error(error.message || 'Failed to get order');
    }
  }

  /**
   * Get orders by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of orders
   */
  async getByUser(userId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!userId) throw new Error('User ID is required');

      const ordersQuery = query(
        collection(db, ORDERS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw new Error(error.message || 'Failed to get user orders');
    }
  }

  /**
   * Get all orders (admin only)
   * @returns {Promise<Array>} - Array of all orders
   */
  async getAll() {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const ordersQuery = query(
        collection(db, ORDERS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw new Error(error.message || 'Failed to get orders');
    }
  }
}

export default new OrderService();


