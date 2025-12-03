import notificationService from '../services/notificationService';

/**
 * Send Notification Utility
 * Provides convenient functions for sending different types of notifications
 */

/**
 * Send booking update notification
 * @param {string} userId - Target user UID
 * @param {string} bookingType - 'rental', 'construction', 'renovation', 'buy-sell'
 * @param {string} status - Booking status (e.g., 'accepted', 'rejected', 'completed')
 * @param {string} bookingId - Booking/request ID
 * @param {string} propertyTitle - Optional property/service title
 */
export const sendBookingUpdateNotification = async (
  userId,
  bookingType,
  status,
  bookingId,
  propertyTitle = null
) => {
  try {
    const statusMessages = {
      accepted: 'has been accepted',
      rejected: 'has been rejected',
      completed: 'has been completed',
      pending: 'is pending review',
      in_progress: 'is now in progress',
      cancelled: 'has been cancelled',
    };

    const typeLabels = {
      rental: 'Rental booking',
      construction: 'Construction request',
      renovation: 'Renovation request',
      'buy-sell': 'Buy/Sell request',
    };

    const title = `${typeLabels[bookingType] || 'Booking'} Update`;
    const message = `Your ${typeLabels[bookingType] || 'booking'} ${
      statusMessages[status] || 'has been updated'
    }${propertyTitle ? `: ${propertyTitle}` : ''}`;

    const link = getBookingLink(bookingType, bookingId);

    return await notificationService.create(userId, title, message, 'status-update', link);
  } catch (error) {
    console.error('Error sending booking update notification:', error);
    throw error;
  }
};

/**
 * Send chat message notification
 * @param {string} userId - Target user UID
 * @param {string} senderName - Name of message sender
 * @param {string} chatId - Chat ID
 * @param {string} messagePreview - Preview of message text (optional)
 */
export const sendChatNotification = async (
  userId,
  senderName,
  chatId,
  messagePreview = null
) => {
  try {
    const title = 'New Message';
    const message = messagePreview
      ? `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`
      : `${senderName} sent you a message`;

    return await notificationService.create(userId, title, message, 'info', `/chat?chatId=${chatId}`);
  } catch (error) {
    console.error('Error sending chat notification:', error);
    throw error;
  }
};

/**
 * Send admin alert notification
 * @param {string} userId - Target user UID
 * @param {string} alertType - Type of alert ('warning', 'info', 'error', 'success')
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} link - Optional link URL
 */
export const sendAdminAlert = async (userId, alertType, title, message, link = null) => {
  try {
    return await notificationService.create(userId, title, message, alertType, link);
  } catch (error) {
    console.error('Error sending admin alert:', error);
    throw error;
  }
};

/**
 * Send provider approval notification
 * @param {string} userId - Target user UID
 * @param {string} requestType - 'construction' or 'renovation'
 * @param {string} providerName - Name of provider
 * @param {string} requestId - Request ID
 * @param {boolean} approved - Whether request was approved
 */
export const sendProviderApprovalNotification = async (
  userId,
  requestType,
  providerName,
  requestId,
  approved
) => {
  try {
    const typeLabels = {
      construction: 'Construction request',
      renovation: 'Renovation request',
    };

    const title = `${typeLabels[requestType] || 'Request'} ${approved ? 'Approved' : 'Declined'}`;
    const message = `${providerName} has ${approved ? 'accepted' : 'declined'} your ${
      typeLabels[requestType] || 'request'
    }`;

    const link = getRequestLink(requestType, requestId);

    return await notificationService.create(
      userId,
      title,
      message,
      approved ? 'success' : 'warning',
      link
    );
  } catch (error) {
    console.error('Error sending provider approval notification:', error);
    throw error;
  }
};

/**
 * Send property status update notification
 * @param {string} userId - Target user UID
 * @param {string} propertyTitle - Property title
 * @param {string} status - New status ('published', 'rejected', 'sold', 'rented', etc.)
 * @param {string} propertyId - Property ID
 */
export const sendPropertyStatusNotification = async (
  userId,
  propertyTitle,
  status,
  propertyId
) => {
  try {
    const statusMessages = {
      published: 'has been published and is now live',
      rejected: 'has been rejected',
      sold: 'has been marked as sold',
      rented: 'has been marked as rented',
      inactive: 'has been deactivated',
      active: 'has been activated',
    };

    const title = 'Property Status Update';
    const message = `Your property "${propertyTitle}" ${
      statusMessages[status] || 'status has been updated'
    }`;

    const link = `/properties/${propertyId}`;

    return await notificationService.create(userId, title, message, 'status-update', link);
  } catch (error) {
    console.error('Error sending property status notification:', error);
    throw error;
  }
};

/**
 * Get booking link based on type
 * @param {string} bookingType - Type of booking
 * @param {string} bookingId - Booking ID
 * @returns {string} Link URL
 */
const getBookingLink = (bookingType, bookingId) => {
  const links = {
    rental: `/rental/booking/${bookingId}`,
    construction: `/construction/my-requests/${bookingId}`,
    renovation: `/renovation/my-renovations/${bookingId}`,
    'buy-sell': `/buy-sell/listing/${bookingId}`,
  };
  return links[bookingType] || '/dashboard';
};

/**
 * Get request link based on type
 * @param {string} requestType - Type of request
 * @param {string} requestId - Request ID
 * @returns {string} Link URL
 */
const getRequestLink = (requestType, requestId) => {
  const links = {
    construction: `/construction/my-requests/${requestId}`,
    renovation: `/renovation/my-renovations/${requestId}`,
  };
  return links[requestType] || '/dashboard';
};

/**
 * Send custom notification
 * @param {string} userId - Target user UID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {string} link - Optional link URL
 */
export const sendCustomNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    return await notificationService.create(userId, title, message, type, link);
  } catch (error) {
    console.error('Error sending custom notification:', error);
    throw error;
  }
};





