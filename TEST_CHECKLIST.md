# Aptify - Complete Test Checklist

## Pre-Deployment Testing

### 1. Page Loading Validation

#### Public Pages
- [ ] Home (`/`) - Loads correctly
- [ ] Properties Page (`/properties`) - Lists properties, filters work
- [ ] Property Detail (`/properties/:id`) - Shows full details, images, reviews
- [ ] About (`/about`) - Loads content
- [ ] Contact (`/contact`) - Form loads, validation works
- [ ] Construction Landing (`/construction`) - Loads
- [ ] Construction Providers (`/construction-providers`) - Lists providers
- [ ] Renovation Landing (`/renovation`) - Loads
- [ ] Renovation Providers (`/renovation-providers`) - Lists providers
- [ ] Rental Services (`/rental-services`) - Loads
- [ ] Buy/Sell Landing (`/buy-sell`) - Loads

#### Authentication
- [ ] Login Page (`/auth`) - Login tab works
- [ ] Register Page (`/auth`) - Register tab works
- [ ] Google Login - Works correctly
- [ ] Logout - Works correctly

#### Protected Pages (Require Login)
- [ ] My Account (`/my-account`) - All 8 tabs load
  - [ ] Profile Info tab
  - [ ] My Properties tab
  - [ ] Rental/Buy-Sell Requests tab
  - [ ] Construction Requests tab
  - [ ] Renovation Requests tab
  - [ ] My Chats tab
  - [ ] My Reviews tab
  - [ ] Notifications tab
- [ ] Post Property (`/post-property`) - Form loads, can create/edit
- [ ] Chatbot (`/chatbot`) - Chat interface loads
- [ ] Notifications Page (`/notifications`) - Lists notifications
- [ ] Owner Dashboard (`/owner-dashboard`) - Loads requests
- [ ] Construction Dashboard (`/construction-dashboard`) - Shows user projects
- [ ] Renovation Dashboard (`/renovation-dashboard`) - Shows user projects
- [ ] Constructor Dashboard (`/constructor-dashboard`) - Shows provider projects
- [ ] Renovator Dashboard (`/renovator-dashboard`) - Shows provider projects

#### Admin Pages
- [ ] Admin Panel (`/admin`) - All tabs load
  - [ ] Overview tab - Stats and charts
  - [ ] Manage Users tab
  - [ ] Manage Providers tab
  - [ ] Manage Properties tab
  - [ ] Manage Requests tab
  - [ ] Support Messages tab
  - [ ] Support Chats tab
  - [ ] Notifications Sender tab

### 2. Request Flows Testing

#### Property Flow
- [ ] Create Property
  - [ ] Fill form with all fields
  - [ ] Upload images
  - [ ] Submit successfully
  - [ ] Redirects to `/properties`
  - [ ] Property appears in list
  - [ ] Admin receives notification (check Firestore)
- [ ] Edit Property
  - [ ] Navigate to edit mode
  - [ ] Update fields
  - [ ] Save changes
  - [ ] Changes reflect in property detail
- [ ] Delete Property
  - [ ] Delete as owner
  - [ ] Delete as admin
  - [ ] Property removed from list

#### Rental Request Flow
- [ ] Create Rental Request
  - [ ] Navigate to property detail
  - [ ] Click "Request Rental"
  - [ ] Fill form (dates, message)
  - [ ] Submit
  - [ ] Owner receives notification
  - [ ] Request appears in Owner Dashboard
  - [ ] Request appears in My Account → Rental/Buy-Sell
- [ ] Owner Actions
  - [ ] Accept rental request
  - [ ] User receives notification
  - [ ] Reject rental request
  - [ ] User receives notification

#### Buy/Sell Request Flow
- [ ] Create Purchase Offer
  - [ ] Navigate to property detail (sale type)
  - [ ] Click "Make Purchase Offer"
  - [ ] Fill form (offer amount, message)
  - [ ] Submit
  - [ ] Owner receives notification
  - [ ] Request appears in Owner Dashboard
  - [ ] Request appears in My Account → Rental/Buy-Sell
- [ ] Owner Actions
  - [ ] Accept offer
  - [ ] User receives notification
  - [ ] Reject offer
  - [ ] User receives notification

#### Construction Request Flow
- [ ] Register as Constructor
  - [ ] Fill registration form
  - [ ] Upload CNIC and profile image
  - [ ] Submit
  - [ ] Appears in admin panel (pending approval)
- [ ] Request Construction Service
  - [ ] Browse construction providers
  - [ ] Select provider
  - [ ] Fill request form (budget, timeline, description)
  - [ ] Submit
  - [ ] Provider receives notification
  - [ ] Request appears in Constructor Dashboard
  - [ ] Request appears in My Account → Construction Requests
- [ ] Provider Actions
  - [ ] Accept request
  - [ ] Client receives notification
  - [ ] Reject request
  - [ ] Client receives notification
  - [ ] Update status (In Progress, Completed)
  - [ ] Client receives notification on status change

#### Renovation Request Flow
- [ ] Register as Renovator
  - [ ] Fill registration form
  - [ ] Upload CNIC and profile image
  - [ ] Submit
  - [ ] Appears in admin panel (pending approval)
- [ ] Request Renovation Service
  - [ ] Browse renovation providers
  - [ ] Select provider
  - [ ] Fill request form (budget, timeline, description)
  - [ ] Submit
  - [ ] Provider receives notification
  - [ ] Request appears in Renovator Dashboard
  - [ ] Request appears in My Account → Renovation Requests
- [ ] Provider Actions
  - [ ] Accept request
  - [ ] Client receives notification
  - [ ] Reject request
  - [ ] Client receives notification
  - [ ] Update status (In Progress, Completed)
  - [ ] Client receives notification on status change

### 3. Notifications Testing

#### Notification Creation
- [ ] Property created → Admin notified
- [ ] Rental request → Owner notified
- [ ] Buy/Sell request → Owner notified
- [ ] Construction request → Provider notified
- [ ] Renovation request → Provider notified
- [ ] Project status update → Client notified
- [ ] Review created → Provider notified
- [ ] Support message → Admin notified
- [ ] Chat message → Recipient notified

#### Notification Display
- [ ] Notification Bell shows unread count
- [ ] Click bell → Dropdown shows recent notifications
- [ ] Notifications Page shows all notifications
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Clear all works
- [ ] Notification links navigate correctly
- [ ] Toast popup appears for new notifications

#### Admin Notifications
- [ ] Admin broadcast works
  - [ ] Broadcast to all users
  - [ ] Broadcast to all providers
  - [ ] Broadcast to single UID
- [ ] All recipients receive notification

### 4. Chat Testing

#### User Chat
- [ ] Navigate to `/chatbot`
- [ ] Chat interface loads
- [ ] Send message as user
- [ ] Message appears in chat
- [ ] Admin receives notification
- [ ] Admin sees message in Admin Panel → Support Chats

#### Admin Chat
- [ ] Admin navigates to Admin Panel → Support Chats
- [ ] Sees list of user chats
- [ ] Selects a chat
- [ ] Sees message history
- [ ] Sends reply
- [ ] User receives notification
- [ ] User sees reply in `/chatbot`

#### Real-time Updates
- [ ] User sends message → Admin sees it immediately
- [ ] Admin sends reply → User sees it immediately
- [ ] Messages persist after refresh

### 5. Admin Panel Testing

#### Overview Tab
- [ ] Stats load correctly
  - [ ] Total users count
  - [ ] Total properties count
  - [ ] Approved providers count
  - [ ] Requests count
  - [ ] Support messages count
- [ ] Chart displays data
- [ ] Refresh button works

#### Manage Users Tab
- [ ] User list loads
- [ ] Promote to admin works
- [ ] Demote to user works
- [ ] Delete user works (with confirmation)
- [ ] Cannot demote/delete self

#### Manage Providers Tab
- [ ] Provider list loads
- [ ] Approve provider works
  - [ ] Provider receives notification
  - [ ] User role updated
- [ ] Reject provider works
  - [ ] Provider receives notification
- [ ] View profile modal shows details
- [ ] CNIC and profile image display

#### Manage Properties Tab
- [ ] Property list loads
- [ ] Search/filter works
- [ ] View property modal shows details
- [ ] Suspend property works
  - [ ] Owner receives notification
  - [ ] Property hidden from public list
- [ ] Activate property works
- [ ] Delete property works
  - [ ] Owner receives notification

#### Manage Requests Tab
- [ ] All request types load
  - [ ] Rental requests
  - [ ] Buy/Sell requests
  - [ ] Construction projects
  - [ ] Renovation projects
- [ ] Filters work (type, status, date)
- [ ] View details modal works
- [ ] Update status works
  - [ ] Notifications sent correctly
- [ ] Delete request works

#### Support Messages Tab
- [ ] Message list loads
- [ ] View message details works
- [ ] Reply to message works
  - [ ] Reply saved in subcollection
  - [ ] User receives notification
- [ ] Delete message works

#### Support Chats Tab
- [ ] Chat list loads
- [ ] Select chat works
- [ ] Message history loads
- [ ] Send message works
- [ ] Real-time updates work

#### Notifications Sender Tab
- [ ] Form loads
- [ ] Send to all users works
- [ ] Send to all providers works
- [ ] Send to single UID works
- [ ] Progress indicator shows
- [ ] Completion toast appears

### 6. Reviews & Ratings Testing

#### Create Review
- [ ] Property review
  - [ ] Navigate to property detail
  - [ ] Submit review with rating and comment
  - [ ] Review appears on property
  - [ ] Provider notified (if applicable)
- [ ] Construction provider review
  - [ ] Navigate to provider detail
  - [ ] Submit review
  - [ ] Review appears
  - [ ] Provider notified
- [ ] Renovation provider review
  - [ ] Navigate to provider detail
  - [ ] Submit review
  - [ ] Review appears
  - [ ] Provider notified

#### Review Display
- [ ] Average rating calculates correctly
- [ ] Reviews sorted by latest
- [ ] Duplicate review prevention works
- [ ] Admin can delete reviews

### 7. Authentication Testing

#### Registration
- [ ] Email/password registration works
- [ ] Google registration works
- [ ] User document created in Firestore
- [ ] Redirects after registration

#### Login
- [ ] Email/password login works
- [ ] Google login works
- [ ] Role loads from Firestore
- [ ] Redirects based on role (admin → /admin)

#### Protected Routes
- [ ] Unauthenticated users redirected to `/auth`
- [ ] Admin-only routes protected
- [ ] User role checked correctly

### 8. Data Integrity Testing

#### Firestore Collections
- [ ] `users` - User documents created correctly
- [ ] `properties` - Properties saved with all fields
- [ ] `rentalRequests` - Requests saved correctly
- [ ] `buySellRequests` - Requests saved correctly
- [ ] `constructionProjects` - Projects saved correctly
- [ ] `renovationProjects` - Projects saved correctly
- [ ] `serviceProviders` - Providers saved correctly
- [ ] `reviews` - Reviews saved correctly
- [ ] `notifications` - Notifications created correctly
- [ ] `supportMessages` - Messages saved correctly
- [ ] `supportChats` - Chats structured correctly

#### Storage
- [ ] Property images upload correctly
- [ ] CNIC documents upload correctly
- [ ] Profile images upload correctly
- [ ] Images display correctly

### 9. Error Handling

- [ ] Network errors handled gracefully
- [ ] Firestore errors show user-friendly messages
- [ ] Form validation works
- [ ] Loading states display correctly
- [ ] Empty states display correctly

### 10. Performance Testing

- [ ] Pages load within 3 seconds
- [ ] Images lazy load
- [ ] Infinite scroll/pagination works
- [ ] Real-time listeners don't cause memory leaks

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] No linting errors
- [ ] Environment variables set
- [ ] Firebase project configured

### Build
- [ ] `npm run build` completes successfully
- [ ] Build output in `dist/` directory
- [ ] No build errors or warnings

### Deploy
- [ ] `firebase deploy` completes successfully
- [ ] Functions deploy correctly
- [ ] Firestore rules deploy
- [ ] Storage rules deploy
- [ ] Hosting deploys

### Post-Deployment
- [ ] Production site loads
- [ ] All features work in production
- [ ] Cloud Functions trigger correctly
- [ ] Notifications work in production
- [ ] Real-time features work

---

## Test Results

**Date:** _______________

**Tester:** _______________

**Environment:** [ ] Development [ ] Production

**Overall Status:** [ ] Pass [ ] Fail

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

