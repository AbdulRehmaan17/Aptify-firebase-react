import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Single source of truth - email_subscriptions collection
const SUBSCRIPTIONS_COLLECTION = 'email_subscriptions';

/**
 * EMAIL SUBSCRIPTION SERVICE (Frontend - Firestore Only)
 * 
 * This service writes subscriptions to Firestore.
 * A Firebase Cloud Function (onCreate trigger) handles sending confirmation emails.
 * 
 * Data Model (stored in email_subscriptions):
 * - email: string (lowercase, trimmed)
 * - createdAt: timestamp
 * - source: string (footer, home, etc.)
 * - status: string (pending, active, unsubscribed)
 * 
 * Backend: functions/index.js → onEmailSubscription (Firestore onCreate trigger)
 */
class SubscriptionService {
  /**
   * Subscribe an email to the newsletter
   * 
   * Writes to Firestore. Cloud Function trigger will send confirmation email.
   * 
   * @param {string} email - Email address to subscribe
   * @param {string} source - Source of subscription (footer, home, etc.)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async subscribe(email, source = 'footer') {
    try {
      // Validate email format
      if (!email || typeof email !== 'string' || !email.trim()) {
        return { success: false, message: 'Please enter a valid email address' };
      }

      const trimmedEmail = email.trim().toLowerCase();
      
      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return { success: false, message: 'Please enter a valid email address' };
      }

      // Check Firestore is available
      if (!db) {
        return { 
          success: false, 
          message: 'Subscription service is currently unavailable. Please try again later.' 
        };
      }

      // Check for duplicate email
      const existingQuery = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('email', '==', trimmedEmail)
      );
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        const existingDoc = existingDocs.docs[0];
        const existingData = existingDoc.data();
        
        // Check if already active
        if (existingData.status === 'active') {
          return { success: false, message: 'This email is already subscribed' };
        }
      }

      // Store subscription - Cloud Function onCreate trigger will send email
      await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
        email: trimmedEmail,
        createdAt: serverTimestamp(),
        source: source || 'footer',
        status: 'pending', // Cloud Function will update to 'active' after email sent
      });

      return { 
        success: true, 
        message: 'Successfully subscribed! Please check your email for confirmation.' 
      };
    } catch (error) {
      console.error('Error subscribing email:', error);
      
      // Handle specific error cases
      if (error.code === 'permission-denied') {
        return { 
          success: false, 
          message: 'Subscription service is currently unavailable. Please try again later.' 
        };
      }
      
      // Handle duplicate email
      if (error.code === 'already-exists' || error.message?.includes('already exists')) {
        return { success: false, message: 'This email is already subscribed' };
      }
      
      // Handle network errors
      if (error.code === 'unavailable' || error.message?.includes('network')) {
        return { 
          success: false, 
          message: 'Network error. Please check your connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        message: 'Failed to subscribe. Please try again later.' 
      };
    }
  }
}

export default new SubscriptionService();


