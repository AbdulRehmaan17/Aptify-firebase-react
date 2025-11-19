const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Helper function to create a notification
 * @param {string} userId - Target user UID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
 * @param {string} link - Optional link URL
 */
async function createNotification(userId, title, message, type = 'info', link = null) {
  try {
    await db.collection('notifications').add({
      userId,
      title,
      message,
      type,
      read: false,
      link,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
  }
}

/**
 * Helper function to get all admin user IDs
 * @returns {Promise<Array<string>>} - Array of admin user IDs
 */
async function getAdminUserIds() {
  try {
    const adminUsersSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    return adminUsersSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

/**
 * 1. On new property → notify admin
 */
exports.onPropertyCreated = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snap, context) => {
    const property = snap.data();
    const propertyId = context.params.propertyId;

    console.log(`New property created: ${propertyId}`);

    // Get all admin users
    const adminUserIds = await getAdminUserIds();

    // Notify all admins
    const notificationPromises = adminUserIds.map(adminId =>
      createNotification(
        adminId,
        'New Property Listed',
        `A new property "${property.title || 'Untitled'}" has been listed by a user.`,
        'info',
        `/admin`
      )
    );

    await Promise.all(notificationPromises);
    console.log(`Notified ${adminUserIds.length} admin(s) about new property`);
  });

/**
 * 2. On new rental request → notify owner
 */
exports.onRentalRequestCreated = functions.firestore
  .document('rentalRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const requestId = context.params.requestId;

    console.log(`New rental request created: ${requestId}`);

    // Get property to find owner
    try {
      const propertyDoc = await db.collection('properties').doc(request.propertyId).get();
      
      if (!propertyDoc.exists) {
        console.error(`Property ${request.propertyId} not found`);
        return;
      }

      const property = propertyDoc.data();
      const ownerId = property.ownerId || property.userId;

      if (!ownerId) {
        console.error(`No owner found for property ${request.propertyId}`);
        return;
      }

      // Notify property owner
      await createNotification(
        ownerId,
        'New Rental Request',
        `You have received a new rental request for "${property.title || 'your property'}".`,
        'info',
        `/owner-dashboard`
      );

      console.log(`Notified owner ${ownerId} about rental request`);
    } catch (error) {
      console.error('Error processing rental request notification:', error);
    }
  });

/**
 * 3. On new buy/sell request → notify owner
 */
exports.onBuySellRequestCreated = functions.firestore
  .document('buySellRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const requestId = context.params.requestId;

    console.log(`New buy/sell request created: ${requestId}`);

    // Get property to find owner
    try {
      const propertyDoc = await db.collection('properties').doc(request.propertyId).get();
      
      if (!propertyDoc.exists) {
        console.error(`Property ${request.propertyId} not found`);
        return;
      }

      const property = propertyDoc.data();
      const ownerId = property.ownerId || property.userId;

      if (!ownerId) {
        console.error(`No owner found for property ${request.propertyId}`);
        return;
      }

      // Notify property owner
      const offerAmount = request.offerAmount || 0;
      await createNotification(
        ownerId,
        'New Purchase Offer',
        `You have received a new purchase offer of ${new Intl.NumberFormat('en-PK', {
          style: 'currency',
          currency: 'PKR',
        }).format(offerAmount)} for "${property.title || 'your property'}".`,
        'info',
        `/owner-dashboard`
      );

      console.log(`Notified owner ${ownerId} about buy/sell request`);
    } catch (error) {
      console.error('Error processing buy/sell request notification:', error);
    }
  });

/**
 * 4. On construction request → notify provider
 */
exports.onConstructionRequestCreated = functions.firestore
  .document('constructionProjects/{projectId}')
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const projectId = context.params.projectId;

    console.log(`New construction project created: ${projectId}`);

    const providerId = project.providerId;

    if (!providerId) {
      console.error(`No provider found for construction project ${projectId}`);
      return;
    }

    // Notify provider
    await createNotification(
      providerId,
      'New Construction Request',
      `You have received a new construction project request. Budget: ${new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
      }).format(project.budget || 0)}`,
      'info',
      `/constructor-dashboard`
    );

    console.log(`Notified provider ${providerId} about construction request`);
  });

/**
 * 5. On renovation request → notify provider
 */
exports.onRenovationRequestCreated = functions.firestore
  .document('renovationProjects/{projectId}')
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const projectId = context.params.projectId;

    console.log(`New renovation project created: ${projectId}`);

    const providerId = project.providerId;

    if (!providerId) {
      console.error(`No provider found for renovation project ${projectId}`);
      return;
    }

    // Notify provider
    await createNotification(
      providerId,
      'New Renovation Request',
      `You have received a new renovation project request. Budget: ${new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
      }).format(project.budget || 0)}`,
      'info',
      `/renovator-dashboard`
    );

    console.log(`Notified provider ${providerId} about renovation request`);
  });

/**
 * 6. On construction project status update → notify client
 */
exports.onConstructionProjectUpdated = functions.firestore
  .document('constructionProjects/{projectId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const projectId = context.params.projectId;

    // Only notify if status changed
    if (before.status === after.status) {
      return;
    }

    console.log(`Construction project ${projectId} status changed: ${before.status} → ${after.status}`);

    const userId = after.userId;

    if (!userId) {
      console.error(`No user found for construction project ${projectId}`);
      return;
    }

    // Notify client
    await createNotification(
      userId,
      'Construction Project Status Updated',
      `Your construction project status has been updated to "${after.status || 'Unknown'}".`,
      'info',
      `/construction-dashboard`
    );

    console.log(`Notified client ${userId} about construction project status update`);
  });

/**
 * 7. On renovation project status update → notify client
 */
exports.onRenovationProjectUpdated = functions.firestore
  .document('renovationProjects/{projectId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const projectId = context.params.projectId;

    // Only notify if status changed
    if (before.status === after.status) {
      return;
    }

    console.log(`Renovation project ${projectId} status changed: ${before.status} → ${after.status}`);

    const userId = after.userId;

    if (!userId) {
      console.error(`No user found for renovation project ${projectId}`);
      return;
    }

    // Notify client
    await createNotification(
      userId,
      'Renovation Project Status Updated',
      `Your renovation project status has been updated to "${after.status || 'Unknown'}".`,
      'info',
      `/renovation-dashboard`
    );

    console.log(`Notified client ${userId} about renovation project status update`);
  });

/**
 * 8. On new review → notify provider
 */
exports.onReviewCreated = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async (snap, context) => {
    const review = snap.data();
    const reviewId = context.params.reviewId;

    console.log(`New review created: ${reviewId}`);

    // Only notify if review is for a provider (construction or renovation)
    if (review.targetType !== 'construction' && review.targetType !== 'renovation') {
      return;
    }

    const providerId = review.targetId;

    if (!providerId) {
      console.error(`No provider ID found for review ${reviewId}`);
      return;
    }

    // Get reviewer name
    let reviewerName = 'A user';
    try {
      const reviewerDoc = await db.collection('users').doc(review.reviewerId).get();
      if (reviewerDoc.exists) {
        const reviewerData = reviewerDoc.data();
        reviewerName = reviewerData.name || reviewerData.displayName || 'A user';
      }
    } catch (error) {
      console.error('Error fetching reviewer name:', error);
    }

    // Notify provider
    const serviceType = review.targetType === 'construction' ? 'Construction' : 'Renovation';
    await createNotification(
      providerId,
      'New Review Received',
      `${reviewerName} left a ${review.rating}-star review for your ${serviceType.toLowerCase()} service.`,
      'info',
      review.targetType === 'construction' 
        ? `/constructor-dashboard` 
        : `/renovator-dashboard`
    );

    console.log(`Notified provider ${providerId} about new review`);
  });

/**
 * 9. On support message → notify admin
 */
exports.onSupportMessageCreated = functions.firestore
  .document('supportMessages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;

    console.log(`New support message created: ${messageId}`);

    // Get all admin users
    const adminUserIds = await getAdminUserIds();

    // Notify all admins
    const notificationPromises = adminUserIds.map(adminId =>
      createNotification(
        adminId,
        'New Support Message',
        `A new support message has been received: "${message.subject || 'No subject'}".`,
        'info',
        `/admin`
      )
    );

    await Promise.all(notificationPromises);
    console.log(`Notified ${adminUserIds.length} admin(s) about support message`);
  });

/**
 * 10. On support chat message → notify recipient (admin/user)
 */
exports.onSupportChatMessageCreated = functions.firestore
  .document('supportChats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;
    const chatId = context.params.chatId;

    console.log(`New support chat message created: ${messageId} in chat ${chatId}`);

    try {
      // Get chat document to find userId and adminId
      const chatDoc = await db.collection('supportChats').doc(chatId).get();

      if (!chatDoc.exists) {
        console.error(`Chat ${chatId} not found`);
        return;
      }

      const chatData = chatDoc.data();
      const userId = chatData.userId;
      const adminId = chatData.adminId;

      // Determine recipient
      let recipientId = null;
      let notificationTitle = '';
      let notificationLink = '';

      if (message.isAdmin) {
        // Admin sent message, notify user
        recipientId = userId;
        notificationTitle = 'New Support Chat Message';
        notificationLink = '/chatbot';
      } else {
        // User sent message, notify admin
        // Get all admins if no specific admin assigned
        if (adminId) {
          recipientId = adminId;
        } else {
          // Notify all admins
          const adminUserIds = await getAdminUserIds();
          const notificationPromises = adminUserIds.map(adminId =>
            createNotification(
              adminId,
              'New Support Chat Message',
              `You have a new message from a user: "${message.text?.substring(0, 50) || 'New message'}${message.text?.length > 50 ? '...' : ''}"`,
              'info',
              '/admin'
            )
          );
          await Promise.all(notificationPromises);
          console.log(`Notified ${adminUserIds.length} admin(s) about support chat message`);
          return;
        }
        notificationTitle = 'New Support Chat Message';
        notificationLink = '/admin';
      }

      if (!recipientId) {
        console.error(`No recipient found for chat message ${messageId}`);
        return;
      }

      // Notify recipient
      await createNotification(
        recipientId,
        notificationTitle,
        `You have a new message: "${message.text?.substring(0, 50) || 'New message'}${message.text?.length > 50 ? '...' : ''}"`,
        'info',
        notificationLink
      );

      console.log(`Notified recipient ${recipientId} about support chat message`);
    } catch (error) {
      console.error('Error processing support chat message notification:', error);
    }
  });

