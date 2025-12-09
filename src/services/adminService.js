import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Admin Service
 * Handles admin-specific operations
 */
class AdminService {
  /**
   * Get all users
   * @returns {Promise<Array>} - Array of user documents
   */
  async getAllUsers() {
    try {
      if (!db) {
        const error = new Error('Firestore database is not initialized');
        console.error('❌ ERROR [getAllUsers]: Firestore db is null!');
        throw error;
      }
      
      console.log('🔍 Fetching all users from Firestore...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`✅ Fetched ${usersSnapshot.docs.length} users`);
      
      return usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('❌ ERROR [getAllUsers]:', error);
      console.error('   Error Code:', error.code);
      console.error('   Error Message:', error.message);
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  /**
   * Update user role
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @returns {Promise<void>}
   */
  async updateUserRole(userId, newRole) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error(error.message || 'Failed to update user role');
    }
  }

  /**
   * Get all service providers
   * @returns {Promise<Array>} - Array of provider documents
   */
  async getAllProviders() {
    try {
      if (!db) {
        const error = new Error('Firestore database is not initialized');
        console.error('❌ ERROR [getAllProviders]: Firestore db is null!');
        throw error;
      }
      
      console.log('🔍 Fetching all service providers from Firestore...');
      const providersSnapshot = await getDocs(collection(db, 'serviceProviders'));
      console.log(`✅ Fetched ${providersSnapshot.docs.length} providers`);
      
      return providersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('❌ ERROR [getAllProviders]:', error);
      console.error('   Error Code:', error.code);
      console.error('   Error Message:', error.message);
      throw new Error(error.message || 'Failed to fetch providers');
    }
  }

  /**
   * Approve provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<void>}
   */
  async approveProvider(providerId) {
    try {
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        isApproved: true,
        approved: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error approving provider:', error);
      throw new Error(error.message || 'Failed to approve provider');
    }
  }

  /**
   * Reject provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<void>}
   */
  async rejectProvider(providerId) {
    try {
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        isApproved: false,
        approved: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting provider:', error);
      throw new Error(error.message || 'Failed to reject provider');
    }
  }

  /**
   * Delete provider
   * @param {string} providerId - Provider ID
   * @returns {Promise<void>}
   */
  async deleteProvider(providerId) {
    try {
      await deleteDoc(doc(db, 'serviceProviders', providerId));
    } catch (error) {
      console.error('Error deleting provider:', error);
      throw new Error(error.message || 'Failed to delete provider');
    }
  }

  /**
   * Get all properties
   * @returns {Promise<Array>} - Array of property documents
   */
  async getAllProperties() {
    try {
      const propertiesSnapshot = await getDocs(collection(db, 'properties'));
      return propertiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw new Error(error.message || 'Failed to fetch properties');
    }
  }

  /**
   * Suspend property
   * @param {string} propertyId - Property ID
   * @returns {Promise<void>}
   */
  async suspendProperty(propertyId) {
    try {
      await updateDoc(doc(db, 'properties', propertyId), {
        status: 'suspended',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error suspending property:', error);
      throw new Error(error.message || 'Failed to suspend property');
    }
  }

  /**
   * Get all support messages
   * @returns {Promise<Array>} - Array of support message documents
   */
  async getAllSupportMessages() {
    try {
      const messagesSnapshot = await getDocs(
        query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'))
      );
      return messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching support messages:', error);
      throw new Error(error.message || 'Failed to fetch support messages');
    }
  }

  /**
   * Reply to support message
   * @param {string} messageId - Support message ID
   * @param {string} senderId - Admin user ID
   * @param {string} replyText - Reply message
   * @returns {Promise<void>}
   */
  async replyToSupportMessage(messageId, senderId, replyText) {
    try {
      await addDoc(collection(db, 'supportMessages', messageId, 'replies'), {
        senderId,
        message: replyText,
        isAdmin: true,
        createdAt: serverTimestamp(),
      });

      // Update message status
      await updateDoc(doc(db, 'supportMessages', messageId), {
        status: 'in-progress',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error replying to support message:', error);
      throw new Error(error.message || 'Failed to reply to support message');
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} - Dashboard stats
   */
  async getDashboardStats() {
    try {
      const [users, properties, providers, rentalRequests, buySellRequests, constructionProjects, renovationProjects] =
        await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'properties')),
          getDocs(collection(db, 'serviceProviders')),
          getDocs(collection(db, 'rentalRequests')),
          getDocs(collection(db, 'buySellRequests')),
          getDocs(collection(db, 'constructionProjects')),
          getDocs(collection(db, 'renovationProjects')),
        ]);

      const stats = {
        totalUsers: users.size,
        totalProperties: properties.size,
        totalProviders: providers.size,
        totalRentalRequests: rentalRequests.size,
        totalBuySellRequests: buySellRequests.size,
        totalConstructionProjects: constructionProjects.size,
        totalRenovationProjects: renovationProjects.size,
        pendingProviders: providers.docs.filter(
          (doc) => !doc.data().isApproved && !doc.data().approved
        ).length,
        pendingProperties: properties.docs.filter((doc) => doc.data().status === 'pending').length,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error(error.message || 'Failed to fetch dashboard stats');
    }
  }
}

export default new AdminService();

