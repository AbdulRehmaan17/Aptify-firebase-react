# Aptify - Manual Test Checklist

This document provides a comprehensive end-to-end testing checklist for the Aptify web application.

## Prerequisites

Before starting tests, ensure:
- [ ] Firebase project is set up and configured
- [ ] Environment variables are set in `.env.local`
- [ ] Firebase emulators are running (for local testing) OR production environment is ready
- [ ] Browser console is open to monitor errors

---

## 1. User Setup & Authentication

### 1.1 Create Test Users
- [ ] **Create Regular User 1** (via email sign-up)
  - Email: `testuser1@aptify.com`
  - Password: `Test123!@#`
  - Verify email confirmation works
  - Verify user document created in `users` collection

- [ ] **Create Regular User 2** (via email sign-up)
  - Email: `testuser2@aptify.com`
  - Password: `Test123!@#`
  - Verify user document created

- [ ] **Create Admin User**
  - Email: `admin@aptify.com`
  - Password: `Admin123!@#`
  - Manually set `role: 'admin'` in Firestore `users/{uid}`
  - Verify admin can access `/admin` route

- [ ] **Create Provider User**
  - Email: `provider@aptify.com`
  - Password: `Provider123!@#`
  - Register as constructor via `/register-constructor`
  - Verify provider document created in `serviceProviders` collection
  - Admin approves provider in Admin Panel
  - Verify `isApproved: true` in provider document

### 1.2 Test Authentication Methods
- [ ] **Email Sign-In**
  - Sign out
  - Sign in with `testuser1@aptify.com`
  - Verify successful login
  - Verify redirect to appropriate page

- [ ] **Google Sign-In**
  - Sign out
  - Click "Sign in with Google"
  - Complete Google OAuth flow
  - Verify user document created/updated
  - Verify successful login

- [ ] **Sign Out**
  - Click sign out button
  - Verify redirect to home page
  - Verify protected routes are inaccessible

---

## 2. Property Management

### 2.1 Post Property
- [ ] **Navigate to Post Property Page**
  - As `testuser1`, go to `/post-property`
  - Verify form loads correctly

- [ ] **Fill Property Form**
  - Title: "Test Property 1"
  - Description: "A beautiful test property"
  - Price: 5000000
  - Type: Sale
  - Address: Complete address fields
  - Bedrooms: 3
  - Bathrooms: 2
  - Area: 2000
  - Select amenities
  - Upload 2-3 test images

- [ ] **Submit Property**
  - Click "Submit Property"
  - Verify confirmation modal appears
  - Click "Confirm & Submit"
  - Verify success modal appears
  - Verify toast notification: "Property submitted successfully!"
  - Verify auto-redirect to `/account` after 2 seconds
  - Verify property document created in `properties` collection
  - Verify images uploaded to Firebase Storage

- [ ] **Verify Admin Notification**
  - As admin, check notifications
  - Verify notification: "New Property Listed"
  - Verify notification link works

- [ ] **Verify Owner Confirmation**
  - As `testuser1`, check notifications
  - Verify notification: "Property Listed Successfully"
  - Verify notification link works

### 2.2 View & Edit Property
- [ ] **View Property List**
  - Navigate to `/properties`
  - Verify property appears in list
  - Click on property
  - Verify property detail page loads

- [ ] **Edit Property**
  - As `testuser1`, go to `/account` → My Properties
  - Click "Edit" on property
  - Modify title to "Updated Test Property"
  - Click "Update Property"
  - Verify property updated in Firestore
  - Verify updated title appears

### 2.3 Property Images
- [ ] **Verify Image Upload**
  - Check Firebase Storage: `properties/{propertyId}/images/`
  - Verify images are stored correctly
  - Verify images display on property detail page

---

## 3. Rental & Buy/Sell Requests

### 3.1 Submit Rental Request
- [ ] **As `testuser2`, submit rental request**
  - Navigate to property detail page (property owned by `testuser1`)
  - Click "Request Rental"
  - Fill form:
    - Start Date: Future date
    - End Date: After start date
    - Message: "I'm interested in renting this property"
  - Click "Submit Request"
  - Verify confirmation modal
  - Verify success modal
  - Verify toast notification
  - Verify auto-redirect to `/account`

- [ ] **Verify Request Created**
  - Check `rentalRequests` collection
  - Verify document created with correct data
  - Verify status: "Pending"

- [ ] **Verify Owner Notification**
  - As `testuser1` (owner), check notifications
  - Verify notification: "New Rental Request"
  - Verify notification link works

- [ ] **Verify Owner Sees Request**
  - As `testuser1`, go to `/owner-dashboard` or `/account`
  - Verify rental request appears
  - Verify request details are correct

### 3.2 Owner Accept/Reject Rental Request
- [ ] **Accept Rental Request**
  - As `testuser1`, accept the rental request
  - Verify status updated to "Accepted"
  - Verify `testuser2` receives notification
  - Verify notification: "Rental Request Accepted"

- [ ] **Reject Rental Request** (create new request first)
  - As `testuser1`, reject a rental request
  - Verify status updated to "Rejected"
  - Verify requester receives notification

### 3.3 Submit Buy/Sell Offer
- [ ] **Submit Purchase Offer**
  - As `testuser2`, navigate to property detail page
  - Click "Make Offer"
  - Fill offer form:
    - Offer Amount: 4800000
    - Message: "I'd like to purchase this property"
  - Submit offer
  - Verify confirmation modal
  - Verify success modal
  - Verify request created in `buySellRequests` collection

- [ ] **Verify Owner Notification**
  - As `testuser1`, check notifications
  - Verify notification: "New Purchase Offer"
  - Verify offer amount in notification

---

## 4. Construction & Renovation Requests

### 4.1 Submit Construction Request
- [ ] **As `testuser1`, submit construction request**
  - Navigate to `/request-construction`
  - Select provider: `provider@aptify.com` (approved provider)
  - Budget: 1000000
  - Timeline: "3 months"
  - Description: "Build a new house" (min 20 characters)
  - Click "Submit Request"
  - Verify confirmation modal
  - Verify success modal
  - Verify toast notification

- [ ] **Verify Request Created**
  - Check `constructionProjects` collection
  - Verify document created
  - Verify status: "Pending"
  - Verify `providerId` set correctly

- [ ] **Verify Client Confirmation**
  - As `testuser1`, check notifications
  - Verify notification: "Construction Request Submitted"

- [ ] **Verify Provider Notification**
  - As provider, check notifications
  - Verify notification: "New Construction Request"
  - Verify budget amount in notification

### 4.2 Provider Accepts Construction Request
- [ ] **Provider Accepts Request**
  - As provider, go to provider dashboard
  - Find the construction request
  - Click "Accept"
  - Verify status updated to "Accepted"
  - Verify `testuser1` receives notification
  - Verify notification: "Construction Project Status Updated"

### 4.3 Provider Updates Status
- [ ] **Update to In Progress**
  - As provider, update project status to "InProgress"
  - Verify `testuser1` receives notification
  - Verify provider also receives notification

- [ ] **Update to Completed**
  - As provider, update project status to "Completed"
  - Verify both client and provider receive notifications

### 4.4 Submit Renovation Request
- [ ] **Submit Renovation Request**
  - As `testuser2`, navigate to `/request-renovation`
  - Select provider
  - Fill form with valid data
  - Submit request
  - Verify all notifications work (same as construction)

---

## 5. Chat System

### 5.1 User-to-Provider Chat
- [ ] **Start Chat**
  - As `testuser1`, navigate to provider detail page
  - Click "Contact Provider" or "Start Chat"
  - Verify chat created in `chats` collection
  - Verify participants array contains both user IDs

- [ ] **Send Messages**
  - As `testuser1`, send message: "Hello, I'm interested in your services"
  - Verify message appears immediately (real-time)
  - Verify message saved in `chats/{chatId}/messages` subcollection
  - Verify provider receives notification: "New Chat Message"

- [ ] **Provider Replies**
  - As provider, open chat
  - Send reply: "Thank you for your interest!"
  - Verify message appears for `testuser1`
  - Verify `testuser1` receives notification

- [ ] **Real-time Sync**
  - Open chat in two browser windows (different users)
  - Send message from one window
  - Verify message appears in other window immediately
  - No page refresh needed

### 5.2 Support Chat (Chatbot)
- [ ] **User Starts Support Chat**
  - As `testuser1`, navigate to `/chatbot`
  - Send message: "I need help with my account"
  - Verify chat created in `supportChats` collection
  - Verify message saved in subcollection

- [ ] **Admin Receives Notification**
  - As admin, check notifications
  - Verify notification: "New Support Chat Message"
  - Verify notification link works

- [ ] **Admin Replies**
  - As admin, go to Admin Panel → Support Chats
  - Select the chat
  - Send reply: "How can I help you?"
  - Verify `testuser1` receives notification
  - Verify message appears in chatbot for `testuser1`

- [ ] **Real-time Updates**
  - Verify messages sync in real-time
  - No refresh needed

---

## 6. Reviews & Ratings

### 6.1 Submit Review for Property
- [ ] **Submit Property Review**
  - As `testuser2`, navigate to property detail page
  - Scroll to reviews section
  - Click "Write a Review"
  - Select 5 stars
  - Comment: "Excellent property, highly recommended!" (min 10 chars)
  - Submit review
  - Verify success toast
  - Verify review appears in list
  - Verify review document created in `reviews` collection

- [ ] **Verify Average Rating Updated**
  - Check property document in Firestore
  - Verify `averageRating` field updated
  - Verify `reviewCount` incremented
  - Verify stars display correctly on property page

### 6.2 Submit Review for Provider
- [ ] **Submit Provider Review**
  - As `testuser1`, navigate to provider detail page
  - Submit review with rating and comment
  - Verify review created
  - Verify provider receives notification: "New Review Received"
  - Verify provider's average rating updated in `serviceProviders` collection

### 6.3 Edit Review
- [ ] **Edit Existing Review**
  - As `testuser2`, go to `/account` → My Reviews
  - Click "Edit" on a review
  - Update rating and comment
  - Submit update
  - Verify review updated
  - Verify average rating recalculated

---

## 7. Notifications System

### 7.1 Notification Display
- [ ] **Notification Bell**
  - Verify notification bell shows unread count
  - Click bell, verify dropdown shows recent notifications
  - Verify notifications are clickable

- [ ] **Notifications Page**
  - Navigate to `/notifications`
  - Verify all notifications displayed
  - Verify notifications sorted by date (newest first)
  - Verify notification types display correctly

### 7.2 Mark as Read
- [ ] **Mark Single Notification as Read**
  - Click on a notification
  - Verify notification marked as read
  - Verify `read: true` in Firestore
  - Verify unread count decreases

- [ ] **Mark All as Read**
  - Click "Mark All as Read" button
  - Verify all notifications marked as read
  - Verify unread count becomes 0

### 7.3 Delete Notifications
- [ ] **Delete Single Notification**
  - Click delete icon on a notification
  - Verify notification removed
  - Verify document deleted from Firestore

- [ ] **Clear All Notifications**
  - Click "Clear All" button
  - Verify confirmation modal
  - Confirm deletion
  - Verify all notifications deleted

### 7.4 Notification Types
- [ ] **Verify Different Notification Types**
  - Service request notifications (blue)
  - Status update notifications (yellow)
  - Info notifications (gray)
  - Success notifications (green)
  - Error notifications (red)

---

## 8. Success Modals & Toast Behavior

### 8.1 Form Submissions
- [ ] **Post Property**
  - Verify confirmation modal before submit
  - Verify success modal after submit
  - Verify toast notification
  - Verify auto-redirect

- [ ] **Submit Construction Request**
  - Verify confirmation modal
  - Verify success modal
  - Verify toast
  - Verify redirect

- [ ] **Submit Renovation Request**
  - Verify all modals and toasts work

- [ ] **Submit Rental Request**
  - Verify all modals and toasts work

- [ ] **Contact Form**
  - Verify confirmation modal
  - Verify success modal
  - Verify toast
  - Verify redirect to home

### 8.2 Updates
- [ ] **Update Property**
  - Verify success toast (no modal for edits)
  - Verify redirect to account

- [ ] **Update Profile**
  - Verify success toast
  - Verify profile updated

---

## 9. Mock Payment Flow (if implemented)

### 9.1 Process Payment
- [ ] **Navigate to Payment Page**
  - Go to `/payment-mock`
  - Or navigate from a request with payment link

- [ ] **Fill Payment Form**
  - Amount: 50000
  - Target Type: construction
  - Target ID: (use actual construction project ID)
  - Card Number: 1234 5678 9012 3456
  - Card Name: Test User
  - Expiry: 12/25
  - CVV: 123

- [ ] **Test Random Mode**
  - Leave manual mode unchecked
  - Click "Process Payment"
  - Verify processing animation
  - Verify result (success or failure)
  - Verify transaction document created in `transactions` collection
  - Verify status: "pending" → "success" or "failed"

- [ ] **Test Manual Mode**
  - Check "Manual Mode"
  - Check "Force Success"
  - Process payment
  - Verify success modal
  - Verify transaction status: "success"

- [ ] **Test Failure**
  - Uncheck "Force Success"
  - Process payment
  - Verify failure modal
  - Verify transaction status: "failed"

### 9.2 Verify Request Status Update
- [ ] **After Successful Payment**
  - Check construction project document
  - Verify status updated to "Confirmed" (if was "Pending")
  - Or verify status updated to "Paid" (if was "Accepted")

### 9.3 Admin View Transactions
- [ ] **View Transaction Logs**
  - As admin, go to Admin Panel → Transactions tab
  - Verify transaction appears in list
  - Verify all fields displayed correctly
  - Test filters (status, target type, user ID)

---

## 10. Admin Panel

### 10.1 All Tabs Load
- [ ] **Overview Tab**
  - Verify statistics display
  - Verify charts render

- [ ] **Manage Users Tab**
  - Verify user list loads
  - Verify user details display

- [ ] **Manage Providers Tab**
  - Verify provider list loads
  - Test approve/reject functionality

- [ ] **Manage Properties Tab**
  - Verify property list loads
  - Test property actions

- [ ] **Manage Requests Tab**
  - Verify all request types displayed
  - Test filters work

- [ ] **Manage Reviews Tab**
  - Verify reviews list loads
  - Test delete functionality

- [ ] **Transactions Tab**
  - Verify transactions list loads
  - Test filters

- [ ] **Support Messages Tab**
  - Verify messages list loads
  - Test reply functionality

- [ ] **Support Chats Tab**
  - Verify chats list loads
  - Test chat functionality

- [ ] **Send Notifications Tab**
  - Verify form loads
  - Test sending notifications

- [ ] **Manage Notifications Tab**
  - Verify notifications list loads
  - Test filters

### 10.2 Admin Actions
- [ ] **Approve Provider**
  - Find pending provider
  - Click "Approve"
  - Verify `isApproved: true` in Firestore
  - Verify provider receives notification

- [ ] **Reject Provider**
  - Find pending provider
  - Click "Reject"
  - Enter rejection reason
  - Verify provider receives notification

- [ ] **Delete Property**
  - Find a property
  - Click "Delete"
  - Confirm deletion
  - Verify property deleted from Firestore
  - Verify images deleted from Storage

---

## 11. Real-time Features

### 11.1 Real-time Updates
- [ ] **Property List**
  - Open properties page
  - In another window, create a new property
  - Verify new property appears without refresh

- [ ] **Notifications**
  - Open notifications page
  - Trigger a notification (e.g., accept request)
  - Verify notification appears immediately

- [ ] **Chat Messages**
  - Open chat
  - Send message from another window
  - Verify message appears immediately

- [ ] **Request Status**
  - Open My Account → My Requests
  - Update request status from another window
  - Verify status updates immediately

---

## 12. Error Handling

### 12.1 Network Errors
- [ ] **Disconnect Internet**
  - Try to submit a form
  - Verify error toast appears
  - Verify user-friendly error message

### 12.2 Validation Errors
- [ ] **Form Validation**
  - Submit form with empty required fields
  - Verify validation errors display
  - Verify form doesn't submit

- [ ] **Invalid Data**
  - Enter invalid email format
  - Enter negative price
  - Enter past date for rental
  - Verify validation errors

### 12.3 Permission Errors
- [ ] **Unauthorized Access**
  - Try to access `/admin` as regular user
  - Verify redirect or error message

- [ ] **Edit Other User's Property**
  - Try to edit property owned by another user
  - Verify permission denied

---

## 13. Performance & UX

### 13.1 Loading States
- [ ] **Verify Loading Spinners**
  - All async operations show loading state
  - Buttons show "Loading..." text
  - Forms disabled during submission

### 13.2 Responsive Design
- [ ] **Mobile View**
  - Test on mobile device or browser dev tools
  - Verify layout adapts correctly
  - Verify all features accessible

- [ ] **Tablet View**
  - Test on tablet size
  - Verify layout works

### 13.3 Page Load Times
- [ ] **Initial Load**
  - Verify home page loads < 3 seconds
  - Verify no blocking operations

- [ ] **Navigation**
  - Verify smooth navigation between pages
  - Verify no unnecessary re-renders

---

## 14. Cloud Functions Verification

### 14.1 Function Triggers
- [ ] **Property Created**
  - Create property
  - Check Firebase Console → Functions → Logs
  - Verify `onPropertyCreated` executed
  - Verify notifications created

- [ ] **Construction Project Created**
  - Create construction request
  - Verify `onConstructionProjectCreated` executed
  - Verify notifications created

- [ ] **Project Status Updated**
  - Update project status
  - Verify `onConstructionProjectUpdated` executed
  - Verify notifications created

- [ ] **Review Created**
  - Submit review
  - Verify `onReviewCreated` executed
  - Verify provider notification created

- [ ] **Support Message Created**
  - Submit support message
  - Verify `onSupportMessageCreated` executed
  - Verify admin notifications created

- [ ] **Chat Message Created**
  - Send chat message
  - Verify `onChatMessageCreated` executed
  - Verify receiver notification created

---

## 15. Final Verification

### 15.1 Data Integrity
- [ ] **Verify All Collections**
  - Check Firestore console
  - Verify data structure matches documentation
  - Verify no orphaned documents

### 15.2 Security
- [ ] **Firestore Rules**
  - Test unauthorized access attempts
  - Verify rules prevent unauthorized operations

- [ ] **Storage Rules**
  - Test unauthorized file uploads
  - Verify rules prevent unauthorized access

### 15.3 Browser Compatibility
- [ ] **Chrome**
  - Test all features in Chrome
  - Verify no console errors

- [ ] **Firefox**
  - Test all features in Firefox
  - Verify compatibility

- [ ] **Safari**
  - Test all features in Safari
  - Verify compatibility

- [ ] **Edge**
  - Test all features in Edge
  - Verify compatibility

---

## Test Results Summary

After completing all tests, document:

- **Total Tests:** ___
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Notes:
- 

---

**Tested By:** _________________  
**Date:** _________________  
**Version:** 1.0.0

