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
          .where('serviceType', '==', 'construction')
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
          .where('serviceType', '==', 'renovation')
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

    // Only notify if review is for a provider
    if (review.targetType !== 'provider') {
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

      // Get reviewer name (using authorId)
      const authorId = review.authorId || review.reviewerId; // Support both for backward compatibility
      let reviewerName = 'A user';
      if (authorId) {
        try {
          const reviewerDoc = await db.collection('users').doc(authorId).get();
          if (reviewerDoc.exists) {
            const reviewerData = reviewerDoc.data();
            reviewerName = reviewerData.name || reviewerData.displayName || 'A user';
          }
        } catch (error) {
          console.error('Error fetching reviewer name:', error);
        }
      }

      // Determine service type from provider data
      const serviceType = providerData.serviceType === 'construction' ? 'Construction' : 'Renovation';
      const dashboardLink = providerData.serviceType === 'construction' 
        ? `/constructor-dashboard` 
        : `/renovator-dashboard`;

      // Notify provider
      await createNotification(
        providerUserId,
        'New Review Received',
        `${reviewerName} left a ${review.rating}-star review for your ${serviceType.toLowerCase()} service.`,
        'info',
        dashboardLink
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
      const senderId = message.senderId;
      const receiverId = message.receiverId;

      if (!senderId || !receiverId) {
        console.error(`Missing senderId or receiverId in message ${messageId}`);
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

/**
 * REAL EMAIL SUBSCRIPTION: Callable function that validates, stores, and sends email synchronously
 * Returns success only after email is actually sent
 */
exports.subscribeEmail = functions.https.onCall(async (data, context) => {
  const email = data.email;
  const source = data.source || 'footer';

  // Validate input
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address');
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Enhanced email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address');
  }

  try {
    // Check for duplicate email
    const existingQuery = await db.collection('email_subscriptions')
      .where('email', '==', trimmedEmail)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingData = existingDoc.data();
      
      if (existingData.status === 'active') {
        throw new functions.https.HttpsError('already-exists', 'This email is already subscribed');
      }
    }

    // Store subscription in Firestore
    const subscriptionRef = db.collection('email_subscriptions').doc();
    await subscriptionRef.set({
      email: trimmedEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: source,
      status: 'pending', // Will be updated to 'active' after email sent
    });

    console.log(`[Subscribe Email] Subscription created: ${subscriptionRef.id} for ${trimmedEmail}`);

    // Send confirmation email - try Resend first, then SendGrid, then Gmail SMTP
    let emailSent = false;
    let emailError = null;
    let emailMessageId = null;

    // Option 1: Try Resend (modern, recommended)
    const resendApiKey = functions.config().resend?.api_key || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendApiKey);
        
        const result = await resend.emails.send({
          from: functions.config().resend?.from || process.env.RESEND_FROM || 'Aptify <onboarding@resend.dev>',
          to: trimmedEmail,
          subject: 'Welcome to Aptify Newsletter! 🏠',
          html: getEmailTemplate(trimmedEmail),
        });

        emailSent = true;
        emailMessageId = result.data?.id || result.id || 'sent';
        console.log(`[Subscribe Email] ✅ Email sent via Resend to ${trimmedEmail}. MessageId: ${emailMessageId}`);
      } catch (resendError) {
        console.warn(`[Subscribe Email] Resend failed: ${resendError.message}`);
        emailError = resendError.message;
      }
    }

    // Option 2: Try SendGrid if Resend failed or not configured
    if (!emailSent) {
      const sendGridApiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
      if (sendGridApiKey) {
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(sendGridApiKey);
          
          const msg = {
            to: trimmedEmail,
            from: functions.config().sendgrid?.from || process.env.SENDGRID_FROM || 'noreply@aptify.com',
            subject: 'Welcome to Aptify Newsletter! 🏠',
            html: getEmailTemplate(trimmedEmail),
            text: getEmailTextTemplate(trimmedEmail),
          };

          const result = await sgMail.send(msg);
          emailSent = true;
          emailMessageId = result[0]?.headers?.['x-message-id'] || 'sent';
          console.log(`[Subscribe Email] ✅ Email sent via SendGrid to ${trimmedEmail}. MessageId: ${emailMessageId}`);
        } catch (sendGridError) {
          console.warn(`[Subscribe Email] SendGrid failed: ${sendGridError.message}`);
          emailError = sendGridError.message;
        }
      }
    }

    // Option 3: Try Gmail SMTP if Resend and SendGrid failed or not configured
    if (!emailSent) {
      const emailUser = functions.config().email?.user || process.env.EMAIL_USER;
      const emailPass = functions.config().email?.pass || process.env.EMAIL_PASS;
      const emailFrom = functions.config().email?.from || process.env.EMAIL_FROM || 'noreply@aptify.com';
      
      if (emailUser && emailPass) {
        try {
          const nodemailer = require('nodemailer');
          
          let transporter;
          if (emailUser.includes('@gmail.com')) {
            transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: emailUser,
                pass: emailPass,
              },
            });
          } else {
            transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth: {
                user: emailUser,
                pass: emailPass,
              },
            });
          }

          const info = await transporter.sendMail({
            from: `"Aptify" <${emailFrom}>`,
            to: trimmedEmail,
            subject: 'Welcome to Aptify Newsletter! 🏠',
            html: getEmailTemplate(trimmedEmail),
            text: getEmailTextTemplate(trimmedEmail),
          });

          emailSent = true;
          emailMessageId = info.messageId;
          console.log(`[Subscribe Email] ✅ Email sent via Gmail SMTP to ${trimmedEmail}. MessageId: ${emailMessageId}`);
        } catch (smtpError) {
          console.error(`[Subscribe Email] Gmail SMTP failed: ${smtpError.message}`);
          emailError = smtpError.message;
        }
      }
    }

    // If email was sent, update status to active
    if (emailSent) {
      await subscriptionRef.update({
        status: 'active',
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailMessageId: emailMessageId,
      });
      console.log(`[Subscribe Email] ✅ Subscription ${subscriptionRef.id} marked as active`);
      
      return {
        success: true,
        message: 'Successfully subscribed! Please check your email for confirmation.',
        subscriptionId: subscriptionRef.id,
      };
    } else {
      // Email failed - update status with error
      await subscriptionRef.update({
        status: 'pending',
        emailError: emailError || 'Email service not configured',
        emailErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      throw new functions.https.HttpsError(
        'internal',
        'Subscription saved, but confirmation email could not be sent. Please contact support.',
      );
    }
  } catch (error) {
    console.error('[Subscribe Email] Error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to subscribe. Please try again later.');
  }
});

/**
 * Helper function to generate email HTML template
 */
function getEmailTemplate(email) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome to Aptify!</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Thank you for subscribing to our newsletter!</p>
        <p style="font-size: 16px; margin-bottom: 20px;">You're now part of the Aptify community and will receive the latest updates on:</p>
        <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
          <li style="margin-bottom: 10px;">🏠 New property listings</li>
          <li style="margin-bottom: 10px;">🔨 Renovation service offers</li>
          <li style="margin-bottom: 10px;">💡 Real estate insights and tips</li>
          <li style="margin-bottom: 10px;">🎯 Exclusive deals and promotions</li>
        </ul>
        <p style="font-size: 16px; margin-bottom: 30px;">We're excited to keep you informed about the best real estate opportunities!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aptify.com" style="display: inline-block; background: #0D9488; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visit Aptify</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; margin: 0;">
          If you didn't subscribe to this newsletter, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Helper function to generate email text template
 */
function getEmailTextTemplate(email) {
  return `Welcome to Aptify!

Thank you for subscribing to our newsletter!

You're now part of the Aptify community and will receive the latest updates on:
- New property listings
- Renovation service offers
- Real estate insights and tips
- Exclusive deals and promotions

We're excited to keep you informed about the best real estate opportunities!

Visit us at: https://aptify.com

If you didn't subscribe to this newsletter, please ignore this email.`;
}

/**
 * EMAIL SUBSCRIPTION TRIGGER (Backend - Firestore onCreate)
 * 
 * This trigger fires when a new document is created in email_subscriptions collection.
 * It sends a confirmation email using Resend → SendGrid → Gmail SMTP (fallback chain).
 * 
 * Frontend: subscriptionService.js writes to Firestore
 * Backend: This function sends email automatically
 */
exports.onEmailSubscription = functions.firestore
  .document('email_subscriptions/{subscriptionId}')
  .onCreate(async (snap, context) => {
    const subscription = snap.data();
    const subscriptionId = context.params.subscriptionId;
    const email = subscription.email;
    const source = subscription.source || 'unknown';

    console.log(`[Email Subscription] New subscription: ${subscriptionId} for ${email} from ${source}`);

    if (!email || typeof email !== 'string' || !email.trim()) {
      console.error('[Email Subscription] No valid email found in subscription');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Send confirmation email - try Resend first, then SendGrid, then Gmail SMTP
    let emailSent = false;
    let emailError = null;
    let emailMessageId = null;

    // Option 1: Try Resend (modern, recommended)
    const resendApiKey = functions.config().resend?.api_key || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendApiKey);
        
        const result = await resend.emails.send({
          from: functions.config().resend?.from || process.env.RESEND_FROM || 'Aptify <onboarding@resend.dev>',
          to: trimmedEmail,
          subject: 'Welcome to Aptify Newsletter! 🏠',
          html: getEmailTemplate(trimmedEmail),
        });

        emailSent = true;
        emailMessageId = result.data?.id || result.id || 'sent';
        console.log(`[Email Subscription] ✅ Email sent via Resend to ${trimmedEmail}. MessageId: ${emailMessageId}`);
      } catch (resendError) {
        console.warn(`[Email Subscription] Resend failed: ${resendError.message}`);
        emailError = resendError.message;
      }
    }

    // Option 2: Try SendGrid if Resend failed or not configured
    if (!emailSent) {
      const sendGridApiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
      if (sendGridApiKey) {
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(sendGridApiKey);
          
          const msg = {
            to: trimmedEmail,
            from: functions.config().sendgrid?.from || process.env.SENDGRID_FROM || 'noreply@aptify.com',
            subject: 'Welcome to Aptify Newsletter! 🏠',
            html: getEmailTemplate(trimmedEmail),
            text: getEmailTextTemplate(trimmedEmail),
          };

          const result = await sgMail.send(msg);
          emailSent = true;
          emailMessageId = result[0]?.headers?.['x-message-id'] || 'sent';
          console.log(`[Email Subscription] ✅ Email sent via SendGrid to ${trimmedEmail}. MessageId: ${emailMessageId}`);
        } catch (sendGridError) {
          console.warn(`[Email Subscription] SendGrid failed: ${sendGridError.message}`);
          emailError = sendGridError.message;
        }
      }
    }

    // Option 3: Try Gmail SMTP if Resend and SendGrid failed or not configured
    if (!emailSent) {
      const emailUser = functions.config().email?.user || process.env.EMAIL_USER;
      const emailPass = functions.config().email?.pass || process.env.EMAIL_PASS;
      const emailFrom = functions.config().email?.from || process.env.EMAIL_FROM || 'noreply@aptify.com';
      
      if (emailUser && emailPass) {
        try {
          const nodemailer = require('nodemailer');
          
          let transporter;
          if (emailUser.includes('@gmail.com')) {
            transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: emailUser,
                pass: emailPass,
              },
            });
          } else {
            transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth: {
                user: emailUser,
                pass: emailPass,
              },
            });
          }

          const info = await transporter.sendMail({
            from: `"Aptify" <${emailFrom}>`,
            to: trimmedEmail,
            subject: 'Welcome to Aptify Newsletter! 🏠',
            html: getEmailTemplate(trimmedEmail),
            text: getEmailTextTemplate(trimmedEmail),
          });

          emailSent = true;
          emailMessageId = info.messageId;
          console.log(`[Email Subscription] ✅ Email sent via Gmail SMTP to ${trimmedEmail}. MessageId: ${emailMessageId}`);
        } catch (smtpError) {
          console.error(`[Email Subscription] Gmail SMTP failed: ${smtpError.message}`);
          emailError = smtpError.message;
        }
      }
    }

    // Update subscription status based on email send result
    if (emailSent) {
      await snap.ref.update({
        status: 'active',
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailMessageId: emailMessageId,
      });
      console.log(`[Email Subscription] ✅ Subscription ${subscriptionId} marked as active`);
    } else {
      // Email failed - update status with error
      await snap.ref.update({
        status: 'pending',
        emailError: emailError || 'Email service not configured',
        emailErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.warn(`[Email Subscription] ⚠️ Subscription ${subscriptionId} saved but email not sent. Error: ${emailError || 'Email service not configured'}`);
    }
  });
