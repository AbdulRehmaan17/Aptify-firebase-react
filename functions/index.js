const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Helper function to create a notification
 * @param {string} userId - Target user UID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error', 'service-request', 'status-update', 'admin'
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
 * 1. On new property created → notify admin + confirm to user
 */
exports.onPropertyCreated = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snap, context) => {
    const property = snap.data();
    const propertyId = context.params.propertyId;
    const ownerId = property.ownerId || property.userId;

    console.log(`New property created: ${propertyId}`);

    // Get all admin users
    const adminUserIds = await getAdminUserIds();

    // Notify all admins
    const adminNotificationPromises = adminUserIds.map(adminId =>
      createNotification(
        adminId,
        'New Property Listed',
        `A new property "${property.title || 'Untitled'}" has been listed and is pending approval.`,
        'info',
        `/admin`
      )
    );

    await Promise.all(adminNotificationPromises);
    console.log(`Notified ${adminUserIds.length} admin(s) about new property`);

    // Confirm to user (property owner)
    if (ownerId) {
      await createNotification(
        ownerId,
        'Property Listed Successfully',
        `Your property "${property.title || 'Untitled'}" has been submitted and is pending admin approval.`,
        'status-update',
        `/properties/${propertyId}`
      );
      console.log(`Notified owner ${ownerId} about property submission`);
    }
  });

/**
 * 2. On new construction project created → notify provider + confirm to user
 */
exports.onConstructionProjectCreated = functions.firestore
  .document('constructionProjects/{projectId}')
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const projectId = context.params.projectId;
    const userId = project.userId || project.clientId;
    const providerId = project.providerId;

    console.log(`New construction project created: ${projectId}`);

    // Confirm to user (client)
    if (userId) {
      await createNotification(
        userId,
        'Construction Request Submitted',
        `Your construction request has been submitted successfully. ${providerId ? 'The provider will review it soon.' : 'We will match you with a provider soon.'}`,
        'service-request',
        `/account`
      );
      console.log(`Notified client ${userId} about construction request submission`);
    }

    // Notify provider if assigned
    if (providerId) {
      // Get provider's userId from serviceProviders collection
      try {
        const providerDoc = await db.collection('serviceProviders').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          const providerUserId = providerData.userId;

          if (providerUserId) {
            await createNotification(
              providerUserId,
              'New Construction Request',
              `You have received a new construction request. Budget: ${new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
              }).format(project.budget || 0)}`,
              'service-request',
              `/constructor-dashboard`
            );
            console.log(`Notified provider ${providerUserId} about construction request`);
          }
        }
      } catch (error) {
        console.error('Error fetching provider data:', error);
      }
    } else {
      // Notify all approved construction providers if no specific provider assigned
      try {
        const providersSnapshot = await db.collection('serviceProviders')
          .where('serviceType', '==', 'Construction')
          .where('isApproved', '==', true)
          .get();

        const notificationPromises = providersSnapshot.docs.map(async (providerDoc) => {
          const providerData = providerDoc.data();
          if (providerData.userId) {
            return createNotification(
              providerData.userId,
              'New Construction Request Available',
              `A new construction request is available. Budget: ${new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
              }).format(project.budget || 0)}`,
              'service-request',
              `/constructor-dashboard`
            );
          }
        });

        await Promise.all(notificationPromises);
        console.log(`Notified ${providersSnapshot.docs.length} construction provider(s) about new request`);
      } catch (error) {
        console.error('Error notifying construction providers:', error);
      }
    }
  });

/**
 * 3. On new renovation project created → notify provider + confirm to user
 */
exports.onRenovationProjectCreated = functions.firestore
  .document('renovationProjects/{projectId}')
  .onCreate(async (snap, context) => {
    const project = snap.data();
    const projectId = context.params.projectId;
    const userId = project.userId || project.clientId;
    const providerId = project.providerId;

    console.log(`New renovation project created: ${projectId}`);

    // Confirm to user (client)
    if (userId) {
      await createNotification(
        userId,
        'Renovation Request Submitted',
        `Your renovation request has been submitted successfully. ${providerId ? 'The provider will review it soon.' : 'We will match you with a provider soon.'}`,
        'service-request',
        `/account`
      );
      console.log(`Notified client ${userId} about renovation request submission`);
    }

    // Notify provider if assigned
    if (providerId) {
      // Get provider's userId from serviceProviders collection
      try {
        const providerDoc = await db.collection('serviceProviders').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          const providerUserId = providerData.userId;

          if (providerUserId) {
            await createNotification(
              providerUserId,
              'New Renovation Request',
              `You have received a new renovation request. Budget: ${new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
              }).format(project.budget || 0)}`,
              'service-request',
              `/renovator-dashboard`
            );
            console.log(`Notified provider ${providerUserId} about renovation request`);
          }
        }
      } catch (error) {
        console.error('Error fetching provider data:', error);
      }
    } else {
      // Notify all approved renovation providers if no specific provider assigned
      try {
        const providersSnapshot = await db.collection('serviceProviders')
          .where('serviceType', '==', 'Renovation')
          .where('isApproved', '==', true)
          .get();

        const notificationPromises = providersSnapshot.docs.map(async (providerDoc) => {
          const providerData = providerDoc.data();
          if (providerData.userId) {
            return createNotification(
              providerData.userId,
              'New Renovation Request Available',
              `A new renovation request is available. Budget: ${new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR',
              }).format(project.budget || 0)}`,
              'service-request',
              `/renovator-dashboard`
            );
          }
        });

        await Promise.all(notificationPromises);
        console.log(`Notified ${providersSnapshot.docs.length} renovation provider(s) about new request`);
      } catch (error) {
        console.error('Error notifying renovation providers:', error);
      }
    }
  });

/**
 * 4. On construction project status update → notify client & provider
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

    const userId = after.userId || after.clientId;
    const providerId = after.providerId;

    // Notify client
    if (userId) {
      await createNotification(
        userId,
        'Construction Project Status Updated',
        `Your construction project status has been updated to "${after.status || 'Unknown'}".`,
        'status-update',
        `/account`
      );
      console.log(`Notified client ${userId} about construction project status update`);
    }

    // Notify provider if assigned
    if (providerId) {
      try {
        const providerDoc = await db.collection('serviceProviders').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          const providerUserId = providerData.userId;

          if (providerUserId) {
            await createNotification(
              providerUserId,
              'Construction Project Status Updated',
              `Construction project status has been updated to "${after.status || 'Unknown'}".`,
              'status-update',
              `/constructor-dashboard`
            );
            console.log(`Notified provider ${providerUserId} about construction project status update`);
          }
        }
      } catch (error) {
        console.error('Error notifying provider:', error);
      }
    }
  });

/**
 * 5. On renovation project status update → notify client & provider
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

    const userId = after.userId || after.clientId;
    const providerId = after.providerId;

    // Notify client
    if (userId) {
      await createNotification(
        userId,
        'Renovation Project Status Updated',
        `Your renovation project status has been updated to "${after.status || 'Unknown'}".`,
        'status-update',
        `/account`
      );
      console.log(`Notified client ${userId} about renovation project status update`);
    }

    // Notify provider if assigned
    if (providerId) {
      try {
        const providerDoc = await db.collection('serviceProviders').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          const providerUserId = providerData.userId;

          if (providerUserId) {
            await createNotification(
              providerUserId,
              'Renovation Project Status Updated',
              `Renovation project status has been updated to "${after.status || 'Unknown'}".`,
              'status-update',
              `/renovator-dashboard`
            );
            console.log(`Notified provider ${providerUserId} about renovation project status update`);
          }
        }
      } catch (error) {
        console.error('Error notifying provider:', error);
      }
    }
  });

/**
 * 6. On new review created → notify provider
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

    const targetId = review.targetId;

    if (!targetId) {
      console.error(`No target ID found for review ${reviewId}`);
      return;
    }

    // Get provider's userId from serviceProviders collection
    try {
      const providerDoc = await db.collection('serviceProviders').doc(targetId).get();
      if (!providerDoc.exists) {
        console.error(`Provider ${targetId} not found`);
        return;
      }

      const providerData = providerDoc.data();
      const providerUserId = providerData.userId;

      if (!providerUserId) {
        console.error(`No userId found for provider ${targetId}`);
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
        providerUserId,
        'New Review Received',
        `${reviewerName} left a ${review.rating}-star review for your ${serviceType.toLowerCase()} service.`,
        'info',
        review.targetType === 'construction' 
          ? `/constructor-dashboard` 
          : `/renovator-dashboard`
      );

      console.log(`Notified provider ${providerUserId} about new review`);
    } catch (error) {
      console.error('Error processing review notification:', error);
    }
  });

/**
 * 7. On new support message created → notify admin
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
        `A new support message has been received: "${message.subject || 'No subject'}" from ${message.name || 'a user'}.`,
        'info',
        `/admin`
      )
    );

    await Promise.all(notificationPromises);
    console.log(`Notified ${adminUserIds.length} admin(s) about support message`);
  });

/**
 * 8. On new support chat message created → notify admin or user appropriately
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
      const isAdmin = message.isAdmin || false;

      // Determine recipient
      if (isAdmin) {
        // Admin sent message, notify user
        if (userId) {
          await createNotification(
            userId,
            'New Support Chat Message',
            `You have a new message from support: "${message.text?.substring(0, 50) || 'New message'}${message.text?.length > 50 ? '...' : ''}"`,
            'info',
            `/chatbot`
          );
          console.log(`Notified user ${userId} about support chat message`);
        }
      } else {
        // User sent message, notify admin
        if (adminId) {
          // Notify specific assigned admin
          await createNotification(
            adminId,
            'New Support Chat Message',
            `You have a new message from a user: "${message.text?.substring(0, 50) || 'New message'}${message.text?.length > 50 ? '...' : ''}"`,
            'info',
            `/admin`
          );
          console.log(`Notified admin ${adminId} about support chat message`);
        } else {
          // Notify all admins if no specific admin assigned
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
        }
      }
    } catch (error) {
      console.error('Error processing support chat message notification:', error);
    }
  });

/**
 * 9. On new chat message created → notify receiver
 */
exports.onChatMessageCreated = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;
    const chatId = context.params.chatId;

    console.log(`New chat message created: ${messageId} in chat ${chatId}`);

    try {
      // Get chat document to find participants
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) {
        console.error(`Chat ${chatId} not found`);
        return;
      }

      const chatData = chatDoc.data();
      const participants = chatData.participants || [];
      const senderId = message.senderId;
      const receiverId = participants.find((uid) => uid !== senderId);

      if (!receiverId) {
        console.error(`Receiver not found for chat ${chatId}`);
        return;
      }

      // Get sender name for notification
      let senderName = 'Someone';
      try {
        const senderDoc = await db.collection('users').doc(senderId).get();
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          senderName = senderData.name || senderData.displayName || 'Someone';
        }
      } catch (error) {
        console.error('Error fetching sender name:', error);
      }

      // Create notification for receiver
      await createNotification(
        receiverId,
        'New Chat Message',
        `${senderName}: ${message.text?.substring(0, 50) || 'New message'}${message.text?.length > 50 ? '...' : ''}`,
        'info',
        `/chats?chatId=${chatId}`
      );

      console.log(`Notified ${receiverId} about new chat message`);
    } catch (error) {
      console.error('Error in onChatMessageCreated:', error);
    }
  });
