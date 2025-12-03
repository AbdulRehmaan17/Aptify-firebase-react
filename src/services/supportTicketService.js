import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import notificationService from './notificationService';
import { getOrCreateChat } from '../utils/chatHelpers';

const SUPPORT_TICKETS_COLLECTION = 'supportTickets';

/**
 * Support Ticket Service Class
 * Handles support ticket creation and management
 */
class SupportTicketService {
  /**
   * Create a new support ticket
   * @param {Object} ticketData - Ticket data
   * @param {string} ticketData.userId - User ID
   * @param {string} ticketData.name - User name
   * @param {string} ticketData.email - User email
   * @param {string} ticketData.message - Message content
   * @returns {Promise<Object>} - Created ticket with chatId
   */
  async create(ticketData) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Validate required fields
      const requiredFields = ['userId', 'name', 'email', 'message'];
      const missingFields = requiredFields.filter((field) => !ticketData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Create support ticket
      const ticketRef = await addDoc(collection(db, SUPPORT_TICKETS_COLLECTION), {
        userId: ticketData.userId,
        name: ticketData.name.trim(),
        email: ticketData.email.trim(),
        message: ticketData.message.trim(),
        status: 'open', // 'open', 'in-progress', 'resolved', 'closed'
        priority: ticketData.priority || 'medium', // 'low', 'medium', 'high', 'urgent'
        adminId: null, // Will be assigned when admin responds
        chatId: null, // Will be set after chat creation
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const ticketId = ticketRef.id;

      // Auto-create chat room between user and admin
      // Find first available admin
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['admin', 'superadmin']),
        limit(1)
      );
      const adminsSnapshot = await getDocs(adminsQuery);
      
      let chatId = null;
      if (!adminsSnapshot.empty) {
        const adminId = adminsSnapshot.docs[0].id;
        try {
          // Create or get chat between user and admin
          chatId = await getOrCreateChat(ticketData.userId, adminId);
          
          // Update ticket with chatId
          await updateDoc(ticketRef, {
            chatId,
            adminId,
            status: 'in-progress',
            updatedAt: serverTimestamp(),
          });
        } catch (chatError) {
          console.error('Error creating chat:', chatError);
          // Continue without chat - ticket will still be created
        }
      }

      // Notify all admins
      try {
        const allAdminsQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['admin', 'superadmin'])
        );
        const allAdminsSnapshot = await getDocs(allAdminsQuery);
        
        const notificationPromises = allAdminsSnapshot.docs.map((adminDoc) =>
          notificationService.create(
            adminDoc.id,
            'New Support Ticket',
            `New support ticket from ${ticketData.name}: "${ticketData.message.substring(0, 50)}..."`,
            'admin',
            `/admin?tab=support&ticketId=${ticketId}`
          )
        );
        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error('Error notifying admins:', notifError);
      }

      // Notify user
      await notificationService.create(
        ticketData.userId,
        'Support Ticket Created',
        'Your support ticket has been created. An admin will respond soon.',
        'info',
        chatId ? `/chats?chatId=${chatId}` : '/contact'
      );

      return {
        id: ticketId,
        chatId,
        ...ticketData,
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error(error.message || 'Failed to create support ticket');
    }
  }

  /**
   * Get ticket by ID
   * @param {string} ticketId - Ticket document ID
   * @returns {Promise<Object>} - Ticket data
   */
  async getById(ticketId) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!ticketId) throw new Error('Ticket ID is required');

      const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        throw new Error('Ticket not found');
      }

      return {
        id: ticketSnap.id,
        ...ticketSnap.data(),
      };
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw new Error(error.message || 'Failed to get ticket');
    }
  }

  /**
   * Get all tickets
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of tickets
   */
  async getAll(filters = {}) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      let ticketsQuery = query(
        collection(db, SUPPORT_TICKETS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        ticketsQuery = query(ticketsQuery, where('status', '==', filters.status));
      }

      if (filters.userId) {
        ticketsQuery = query(ticketsQuery, where('userId', '==', filters.userId));
      }

      const snapshot = await getDocs(ticketsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw new Error(error.message || 'Failed to get tickets');
    }
  }

  /**
   * Update ticket status
   * @param {string} ticketId - Ticket document ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(ticketId, status) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
        throw new Error('Invalid ticket status');
      }

      const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
      await updateDoc(ticketRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw new Error(error.message || 'Failed to update ticket status');
    }
  }

  /**
   * Close ticket
   * @param {string} ticketId - Ticket document ID
   * @returns {Promise<void>}
   */
  async close(ticketId) {
    return this.updateStatus(ticketId, 'closed');
  }

  /**
   * Add reply to ticket (creates message in chat)
   * @param {string} ticketId - Ticket document ID
   * @param {string} adminId - Admin user ID
   * @param {string} message - Reply message
   * @returns {Promise<void>}
   */
  async reply(ticketId, adminId, message) {
    try {
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const ticket = await this.getById(ticketId);
      
      if (!ticket.chatId) {
        throw new Error('Ticket does not have an associated chat');
      }

      // Add message to chat
      const messagesRef = collection(db, 'chats', ticket.chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: adminId,
        text: message.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });

      // Update ticket
      await updateDoc(doc(db, SUPPORT_TICKETS_COLLECTION, ticketId), {
        adminId: adminId,
        status: ticket.status === 'open' ? 'in-progress' : ticket.status,
        updatedAt: serverTimestamp(),
      });

      // Notify user
      await notificationService.create(
        ticket.userId,
        'New Support Message',
        `Admin replied to your support ticket: "${message.substring(0, 50)}..."`,
        'info',
        `/chats?chatId=${ticket.chatId}`
      );
    } catch (error) {
      console.error('Error replying to ticket:', error);
      throw new Error(error.message || 'Failed to reply to ticket');
    }
  }
}

export default new SupportTicketService();

