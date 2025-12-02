import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Transaction Service
 * Handles payment transactions and logging
 */
class TransactionService {
  /**
   * Create a new transaction
   * @param {string} userId - User ID making the payment
   * @param {string} targetType - Type of target: 'construction', 'renovation', 'rental', 'buySell', 'property'
   * @param {string} targetId - ID of the target document
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code (default: 'PKR')
   * @param {string} status - Transaction status: 'pending', 'success', 'failed'
   * @returns {Promise<string>} - Transaction document ID
   */
  async create(userId, targetType, targetId, amount, currency = 'PKR', status = 'pending') {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!userId || !targetType || !targetId || !amount) {
        throw new Error('userId, targetType, targetId, and amount are required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const transactionData = {
        userId,
        targetType,
        targetId,
        amount: Number(amount),
        currency,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(error.message || 'Failed to create transaction');
    }
  }

  /**
   * Update transaction status
   * @param {string} transactionId - Transaction document ID
   * @param {string} status - New status: 'pending', 'success', 'failed'
   * @returns {Promise<void>}
   */
  async updateStatus(transactionId, status) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!transactionId || !status) {
        throw new Error('transactionId and status are required');
      }

      const validStatuses = ['pending', 'success', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
      }

      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error(error.message || 'Failed to update transaction status');
    }
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction document ID
   * @returns {Promise<Object>} - Transaction data
   */
  async getById(transactionId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionDoc = await getDoc(transactionRef);

      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }

      return {
        id: transactionDoc.id,
        ...transactionDoc.data(),
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error(error.message || 'Failed to get transaction');
    }
  }

  /**
   * Get all transactions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of transactions
   */
  async getByUser(userId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw new Error(error.message || 'Failed to get user transactions');
    }
  }

  /**
   * Get all transactions (admin only)
   * @returns {Promise<Array>} - Array of all transactions
   */
  async getAll() {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw new Error(error.message || 'Failed to get transactions');
    }
  }

  /**
   * Update related request status after successful payment
   * @param {string} targetType - Type of target
   * @param {string} targetId - ID of target document
   * @returns {Promise<void>}
   */
  async updateRequestStatusOnPayment(targetType, targetId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const collectionMap = {
        construction: 'constructionProjects',
        renovation: 'renovationProjects',
        rental: 'rentalRequests',
        buySell: 'buySellRequests',
      };

      const collectionName = collectionMap[targetType];
      if (!collectionName) {
        console.warn(`Unknown target type: ${targetType}`);
        return;
      }

      const requestRef = doc(db, collectionName, targetId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        console.warn(`Request not found: ${targetId} in ${collectionName}`);
        return;
      }

      const requestData = requestDoc.data();
      const currentStatus = requestData.status;

      // Update status based on request type
      let newStatus;
      if (targetType === 'construction' || targetType === 'renovation') {
        // For construction/renovation, set to 'Confirmed' if pending, or keep current if already accepted
        newStatus = currentStatus === 'Pending' ? 'Confirmed' : currentStatus;
      } else if (targetType === 'rental' || targetType === 'buySell') {
        // For rental/buySell, set to 'Paid' if accepted, or 'Confirmed' if pending
        if (currentStatus === 'Accepted') {
          newStatus = 'Paid';
        } else if (currentStatus === 'Pending') {
          newStatus = 'Confirmed';
        } else {
          newStatus = currentStatus;
        }
      } else {
        // For other types, just set to 'Confirmed'
        newStatus = 'Confirmed';
      }

      // Only update if status changed
      if (newStatus !== currentStatus) {
        await updateDoc(requestRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating request status on payment:', error);
      // Don't throw - this is a side effect
    }
  }
}

const transactionService = new TransactionService();
export default transactionService;

