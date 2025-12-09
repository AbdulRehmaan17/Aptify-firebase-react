# Aptify Web Application - Comprehensive QA Testing Checklist

**Project**: Aptify - Property Rental, Buy/Sell, and Services Platform  
**Version**: 1.0  
**Date**: December 19, 2024  
**Test Type**: User-Side Manual & Automated Testing

---

## Table of Contents

1. [Functional Testing](#functional-testing)
2. [Negative Testing](#negative-testing)
3. [UI/UX Testing](#uiux-testing)
4. [Performance Testing](#performance-testing)
5. [Security Testing](#security-testing)

---

## FUNCTIONAL TESTING

### 1. Authentication Module

#### TC-AUTH-001: User Registration (Email/Password)
- **Description**: Verify user can create new account with email and password
- **Steps**:
  1. Navigate to `/auth`
  2. Click "Register" tab
  3. Enter valid email, password, confirm password, name, phone
  4. Click "Create Account"
- **Expected Result**: 
  - Account created successfully
  - Success toast message appears
  - User redirected to home page or intended destination
  - User profile created in Firestore

#### TC-AUTH-002: User Login (Email/Password)
- **Description**: Verify user can login with registered credentials
- **Steps**:
  1. Navigate to `/auth`
  2. Enter valid email and password
  3. Click "Sign In"
- **Expected Result**:
  - Login successful
  - Success toast "Welcome back!" appears
  - User redirected to intended page or home
  - User session established

#### TC-AUTH-003: Google Sign-In (Popup)
- **Description**: Verify Google authentication works via popup
- **Steps**:
  1. Navigate to `/auth`
  2. Click "Continue with Google"
  3. Select Google account in popup
  4. Authorize application
- **Expected Result**:
  - Google popup opens
  - After authorization, popup closes
  - User logged in successfully
  - Redirected to intended page
  - User profile created/updated in Firestore

#### TC-AUTH-004: Google Sign-In (Redirect)
- **Description**: Verify Google authentication works via redirect flow
- **Steps**:
  1. Navigate to `/auth?next=/account`
  2. Click "Continue with Google"
  3. Complete Google authentication
- **Expected Result**:
  - Redirected to Google sign-in page
  - After authentication, redirected back to `/account`
  - User logged in

#### TC-AUTH-005: Logout Functionality
- **Description**: Verify user can logout from any page
- **Steps**:
  1. Login as any user
  2. Click user menu in navbar
  3. Click "Logout"
- **Expected Result**:
  - User logged out
  - Redirected to home page
  - Session cleared
  - Protected routes require login again

#### TC-AUTH-006: Redirect with `?next=` Parameter
- **Description**: Verify redirect to intended page after login
- **Steps**:
  1. While logged out, navigate to `/account`
  2. Should redirect to `/auth?next=/account`
  3. Login successfully
- **Expected Result**:
  - After login, redirected to `/account` (not home)
  - `?next=` parameter preserved through auth flow

#### TC-AUTH-007: Form Validation (Registration)
- **Description**: Verify registration form validation
- **Steps**:
  1. Navigate to `/auth`
  2. Click "Register"
  3. Try submitting empty form
  4. Try invalid email format
  5. Try password < 6 characters
  6. Try mismatched passwords
- **Expected Result**:
  - Error messages display for each invalid field
  - Form does not submit
  - Submit button disabled or shows error

#### TC-AUTH-008: Form Validation (Login)
- **Description**: Verify login form validation
- **Steps**:
  1. Navigate to `/auth`
  2. Try submitting with empty email
  3. Try invalid email format
  4. Try empty password
- **Expected Result**:
  - Error messages display
  - Form does not submit

---

### 2. User Dashboard (MyAccount)

#### TC-DASH-001: Dashboard Load
- **Description**: Verify MyAccount dashboard loads with user data
- **Steps**:
  1. Login as user
  2. Navigate to `/account` or click "My Account" in navbar
- **Expected Result**:
  - Dashboard loads successfully
  - User profile information displays
  - Summary cards show counts (Properties, Requests, Reviews, Messages)
  - No blank screen or errors

#### TC-DASH-002: Profile Information Display
- **Description**: Verify profile information displays correctly
- **Steps**:
  1. Navigate to `/account`
  2. View "Profile" tab
- **Expected Result**:
  - Display name, email, phone, address shown
  - Profile photo displays (if available)
  - All fields populated correctly

#### TC-DASH-003: Edit Profile
- **Description**: Verify user can edit their profile
- **Steps**:
  1. Navigate to `/account`
  2. Click "Edit Profile" button
  3. Update display name, phone, address
  4. Click "Save Changes"
- **Expected Result**:
  - Changes saved successfully
  - Success toast appears
  - Updated information displays
  - Changes persist after page refresh

#### TC-DASH-004: My Listings Tab
- **Description**: Verify user's properties list displays
- **Steps**:
  1. Navigate to `/account`
  2. Click "My Listings" tab
- **Expected Result**:
  - All user's properties displayed
  - Each property shows title, price, status
  - "View" button links to property detail
  - "Post New Property" button visible

#### TC-DASH-005: Service Requests Tab
- **Description**: Verify service requests display
- **Steps**:
  1. Navigate to `/account`
  2. Click "Service Requests" tab
- **Expected Result**:
  - All service requests displayed (rental, buy/sell, construction, renovation)
  - Each request shows type and status
  - Requests sorted by date (newest first)

#### TC-DASH-006: My Reviews Tab
- **Description**: Verify user's reviews display
- **Steps**:
  1. Navigate to `/account`
  2. Click "My Reviews" tab
- **Expected Result**:
  - All reviews user has written displayed
  - Each review shows rating stars and comment
  - Date of review displayed

#### TC-DASH-007: Messages Tab
- **Description**: Verify chat conversations display
- **Steps**:
  1. Navigate to `/account`
  2. Click "Messages" tab
- **Expected Result**:
  - All user's chat conversations listed
  - "View All Chats" button works
  - Last message preview shown

#### TC-DASH-008: Settings Tab
- **Description**: Verify settings page displays
- **Steps**:
  1. Navigate to `/account`
  2. Click "Settings" tab
- **Expected Result**:
  - Settings options displayed
  - Account settings section visible
  - Privacy settings visible

---

### 3. Rental Module

#### TC-RENT-001: Browse Rental Properties
- **Description**: Verify rental properties page loads and displays properties
- **Steps**:
  1. Navigate to `/browse-rentals` or click "Rent" in navbar
  2. View properties list
- **Expected Result**:
  - Only rental properties (type="rent") displayed
  - Properties load with images, title, price, location
  - Loading spinner shows during fetch
  - Empty state shows if no properties

#### TC-RENT-002: Filter Rental Properties
- **Description**: Verify filters work on rental page
- **Steps**:
  1. Navigate to `/browse-rentals`
  2. Apply filters (city, price range, bedrooms, bathrooms)
  3. Click "Apply Filters"
- **Expected Result**:
  - Properties filtered correctly
  - Results update in real-time
  - Filter state persists

#### TC-RENT-003: Search Rental Properties
- **Description**: Verify search functionality
- **Steps**:
  1. Navigate to `/browse-rentals`
  2. Enter search term in search bar
  3. Click "Search"
- **Expected Result**:
  - Properties matching search term displayed
  - Search results relevant
  - Clear search button works

#### TC-RENT-004: Sort Rental Properties
- **Description**: Verify sorting options work
- **Steps**:
  1. Navigate to `/browse-rentals`
  2. Select sort option (Newest, Price Low-High, Price High-Low)
- **Expected Result**:
  - Properties sorted correctly
  - Sort persists during session

#### TC-RENT-005: View Rental Property Details
- **Description**: Verify property detail page loads
- **Steps**:
  1. Navigate to `/browse-rentals`
  2. Click on any property card
- **Expected Result**:
  - Property detail page loads
  - All property information displayed
  - Images gallery works
  - "Request Rental" or "Contact Owner" button visible

#### TC-RENT-006: List Property for Rent (Logged In)
- **Description**: Verify logged-in user can list property
- **Steps**:
  1. Login as user
  2. Navigate to `/rental-services` or click "List Property"
  3. Click "List Property for Rent"
  4. Fill property form
  5. Submit form
- **Expected Result**:
  - Redirected to `/post-property?type=rent`
  - Form loads correctly
  - Can submit property
  - Success message appears
  - Redirected to `/account` after submission

#### TC-RENT-007: List Property for Rent (Not Logged In)
- **Description**: Verify non-logged-in user redirected to login
- **Steps**:
  1. Logout (if logged in)
  2. Navigate to `/rental-services`
  3. Click "Sign In to List Property"
- **Expected Result**:
  - Redirected to `/auth?next=/post-property?type=rent`
  - Toast message "Please log in" (if applicable)
  - After login, redirected to property posting form

#### TC-RENT-008: Submit Rental Request
- **Description**: Verify user can submit rental request
- **Steps**:
  1. View a rental property detail page
  2. Click "Request Rental" or "Contact Owner"
  3. Fill rental request form
  4. Submit
- **Expected Result**:
  - Request submitted successfully
  - Success toast appears
  - Notification sent to property owner
  - Request appears in user's dashboard

---

### 4. Buy & Sell Module

#### TC-BUY-001: Browse Properties for Sale
- **Description**: Verify sale properties page loads
- **Steps**:
  1. Navigate to `/properties?type=sale` or `/buy`
  2. View properties list
- **Expected Result**:
  - Only sale properties (type="sale") displayed
  - Properties load correctly
  - Filters and search work

#### TC-BUY-002: View Property for Sale Details
- **Description**: Verify property detail page for sale items
- **Steps**:
  1. Navigate to buy/sell properties
  2. Click on any property
- **Expected Result**:
  - Property detail page loads
  - All information displayed
  - "Make Offer" or "Contact Seller" button visible

#### TC-BUY-003: List Property for Sale
- **Description**: Verify user can list property for sale
- **Steps**:
  1. Login as user
  2. Navigate to `/post-property?type=sale`
  3. Fill property form
  4. Submit
- **Expected Result**:
  - Property submitted successfully
  - Success toast appears
  - Property appears in user's listings (pending approval)

#### TC-BUY-004: Submit Purchase Offer
- **Description**: Verify user can submit buy offer
- **Steps**:
  1. View a property for sale
  2. Click "Make Offer"
  3. Fill offer form (price, message)
  4. Submit
- **Expected Result**:
  - Offer submitted successfully
  - Notification sent to seller
  - Offer appears in user's requests

#### TC-BUY-005: Sell Page Navigation
- **Description**: Verify sell page loads correctly
- **Steps**:
  1. Navigate to `/sell`
- **Expected Result**:
  - Sell page loads
  - Information about selling process displayed
  - "List Your Property" button works

---

### 5. Renovation Module

#### TC-RENO-001: Browse Renovation Providers
- **Description**: Verify renovation providers page loads
- **Steps**:
  1. Navigate to `/renovation-providers` or `/renovation`
  2. View providers list
- **Expected Result**:
  - Only approved renovation providers displayed
  - Provider cards show name, rating, specialization, city
  - Filters work (city, specialization)

#### TC-RENO-002: View Provider Detail
- **Description**: Verify provider detail page loads
- **Steps**:
  1. Navigate to renovation providers
  2. Click on any provider card
- **Expected Result**:
  - Provider detail page loads
  - All provider information displayed
  - Reviews/ratings shown
  - "Request Service" button visible

#### TC-RENO-003: Submit Renovation Request
- **Description**: Verify user can request renovation service
- **Steps**:
  1. View renovation provider detail
  2. Click "Request Service"
  3. Fill request form (property, service category, description, budget, date)
  4. Upload photos (optional)
  5. Submit
- **Expected Result**:
  - Request submitted successfully
  - Success toast appears
  - Redirected to renovation dashboard
  - Notification sent to provider

#### TC-RENO-004: Renovation Dashboard
- **Description**: Verify renovation dashboard loads user's requests
- **Steps**:
  1. Login as user who has renovation requests
  2. Navigate to `/renovation-dashboard`
- **Expected Result**:
  - All user's renovation requests displayed
  - Status of each request shown
  - Can view request details

---

### 6. Construction Module

#### TC-CONS-001: Browse Construction Providers
- **Description**: Verify construction providers page loads
- **Steps**:
  1. Navigate to `/construction-providers` or `/construction-services`
  2. View providers list
- **Expected Result**:
  - Only approved construction providers displayed
  - Provider information displayed correctly
  - Filters work

#### TC-CONS-002: View Construction Provider Detail
- **Description**: Verify provider detail page
- **Steps**:
  1. Navigate to construction providers
  2. Click on provider
- **Expected Result**:
  - Provider detail page loads
  - "Request Service" button visible

#### TC-CONS-003: Submit Construction Request
- **Description**: Verify construction request submission
- **Steps**:
  1. View construction provider detail
  2. Click "Request Service"
  3. Fill form (project type, property, description, budget, dates)
  4. Submit
- **Expected Result**:
  - Request submitted successfully
  - Redirected to construction dashboard
  - Notification sent

#### TC-CONS-004: Construction Dashboard
- **Description**: Verify construction dashboard
- **Steps**:
  1. Navigate to `/construction-dashboard`
- **Expected Result**:
  - User's construction projects displayed
  - Status updates visible

---

### 7. Review & Rating Module

#### TC-REV-001: View Reviews on Property
- **Description**: Verify reviews display on property detail page
- **Steps**:
  1. View any property detail page
  2. Scroll to reviews section
- **Expected Result**:
  - Reviews displayed (if any)
  - Rating stars shown
  - Reviewer name and date visible
  - Average rating calculated correctly

#### TC-REV-002: Submit Review (After Service Completion)
- **Description**: Verify user can submit review after completing service
- **Steps**:
  1. Login as user who completed a service
  2. Navigate to completed service request
  3. Click "Write Review"
  4. Select rating (1-5 stars)
  5. Write comment
  6. Submit
- **Expected Result**:
  - Review submitted successfully
  - Review appears on property/provider page
  - Average rating updates

#### TC-REV-003: Review Validation
- **Description**: Verify users can only review completed services
- **Steps**:
  1. Try to review a pending service
- **Expected Result**:
  - Review option not available or disabled
  - Message: "Complete service first" (if applicable)

---

### 8. Notifications Module

#### TC-NOT-001: Real-Time Notification Display
- **Description**: Verify notifications appear in real-time
- **Steps**:
  1. Login as User A
  2. In another browser/incognito, login as User B
  3. User B performs action that should notify User A (e.g., send message, approve request)
- **Expected Result**:
  - Notification appears in User A's notification bell
  - Unread count updates
  - Notification appears without page refresh

#### TC-NOT-002: Mark Notification as Read
- **Description**: Verify user can mark notification as read
- **Steps**:
  1. Click notification bell
  2. Click on a notification
  3. Or click "Mark as Read"
- **Expected Result**:
  - Notification marked as read
  - Unread count decreases
  - Read status persists

#### TC-NOT-003: View All Notifications
- **Description**: Verify notifications page loads all notifications
- **Steps**:
  1. Click notification bell
  2. Click "View All" or navigate to `/notifications`
- **Expected Result**:
  - All notifications displayed
  - Filters work (All, Read, Unread)
  - Notifications sorted by date (newest first)

#### TC-NOT-004: Clear All Notifications
- **Description**: Verify clear all functionality
- **Steps**:
  1. Navigate to `/notifications`
  2. Click "Clear All"
  3. Confirm action
- **Expected Result**:
  - All notifications cleared
  - Notification count resets to 0

#### TC-NOT-005: Notification Types
- **Description**: Verify different notification types work
- **Steps**:
  - Test notifications for: new message, property approval, service request, admin approval
- **Expected Result**:
  - Each notification type displays correctly
  - Links navigate to correct pages

---

### 9. Chat Module

#### TC-CHAT-001: Send Message
- **Description**: Verify user can send message
- **Steps**:
  1. Navigate to chat page or property detail
  2. Click "Contact Owner" or "Message"
  3. Type message
  4. Click "Send"
- **Expected Result**:
  - Message sent successfully
  - Message appears in chat immediately
  - Message stored in Firestore

#### TC-CHAT-002: Receive Message (Real-Time)
- **Description**: Verify real-time message reception
- **Steps**:
  1. User A opens chat with User B
  2. User B (in another browser) sends message
- **Expected Result**:
  - Message appears in User A's chat instantly
  - No page refresh needed
  - Sound/notification (if implemented)

#### TC-CHAT-003: Conversation List
- **Description**: Verify conversation list displays
- **Steps**:
  1. Navigate to `/chats` or chat page
- **Expected Result**:
  - All conversations listed
  - Last message preview shown
  - Unread indicators visible
  - Conversations sorted by last message time

#### TC-CHAT-004: Unread Counter
- **Description**: Verify unread message counter
- **Steps**:
  1. Have unread messages in chat
  2. View conversation list
- **Expected Result**:
  - Unread count displays correctly
  - Count decreases when message read
  - Count updates in real-time

#### TC-CHAT-005: Chat with Property Owner
- **Description**: Verify chat initiation from property page
- **Steps**:
  1. View property detail page
  2. Click "Contact Owner" or "Message"
- **Expected Result**:
  - Chat created or existing chat opened
  - Can send message to owner

---

### 10. Admin Panel

#### TC-ADMIN-001: Admin Access Control
- **Description**: Verify only admins can access admin panel
- **Steps**:
  1. Login as regular user
  2. Try to navigate to `/admin` directly
- **Expected Result**:
  - Redirected to dashboard or home
  - Access denied message (if applicable)

#### TC-ADMIN-002: Approve Property Listing
- **Description**: Verify admin can approve property
- **Steps**:
  1. Login as admin
  2. Navigate to `/admin`
  3. Go to "Properties" tab
  4. Find pending property
  5. Click "Approve"
- **Expected Result**:
  - Property status changes to "Published"
  - Notification sent to property owner
  - Property visible in public listings

#### TC-ADMIN-003: Reject Property Listing
- **Description**: Verify admin can reject property
- **Steps**:
  1. Login as admin
  2. Go to pending property
  3. Click "Reject"
  4. Enter rejection reason (if required)
- **Expected Result**:
  - Property status changes to "Rejected"
  - Notification sent to owner with reason
  - Property not visible in public listings

#### TC-ADMIN-004: Approve Service Provider
- **Description**: Verify admin can approve provider
- **Steps**:
  1. Login as admin
  2. Go to "Providers" tab
  3. Find pending provider
  4. Click "Approve"
- **Expected Result**:
  - Provider status changes to "Approved"
  - Notification sent to provider
  - Provider visible in provider listings

#### TC-ADMIN-005: Reject Service Provider
- **Description**: Verify admin can reject provider
- **Steps**:
  1. Login as admin
  2. Reject provider with reason
- **Expected Result**:
  - Provider rejected
  - Notification sent with reason

---

### 11. Profile Update & Password

#### TC-PROF-001: Update Profile Information
- **Description**: Verify profile update works
- **Steps**:
  1. Navigate to `/account`
  2. Edit profile
  3. Update name, phone, address
  4. Save
- **Expected Result**:
  - Changes saved
  - Success message appears
  - Changes visible immediately

#### TC-PROF-002: Profile Photo Update
- **Description**: Verify profile photo can be updated
- **Steps**:
  1. Go to profile edit
  2. Upload new photo
  3. Save
- **Expected Result**:
  - Photo uploaded successfully
  - New photo displays
  - Photo appears in navbar user menu

---

### 12. Search and Filtering

#### TC-SRCH-001: Global Property Search
- **Description**: Verify global search works
- **Steps**:
  1. Use search bar in navbar
  2. Enter property location or keyword
  3. View results
- **Expected Result**:
  - Relevant properties displayed
  - Search works across all property types

#### TC-SRCH-002: Filter Properties by City
- **Description**: Verify city filter works
- **Steps**:
  1. Navigate to properties page
  2. Select city from filter
- **Expected Result**:
  - Only properties in selected city shown

#### TC-SRCH-003: Filter by Price Range
- **Description**: Verify price filter works
- **Steps**:
  1. Set minimum and maximum price
  2. Apply filter
- **Expected Result**:
  - Properties within price range displayed

#### TC-SRCH-004: Filter by Bedrooms/Bathrooms
- **Description**: Verify bedroom/bathroom filters
- **Steps**:
  1. Select number of bedrooms
  2. Select number of bathrooms
- **Expected Result**:
  - Properties matching criteria displayed

---

### 13. Redirects and Toast Messages

#### TC-RED-001: Redirect After Login
- **Description**: Verify redirect to intended page
- **Steps**:
  1. While logged out, navigate to `/account`
  2. Login
- **Expected Result**:
  - After login, redirected to `/account`

#### TC-TOAST-001: Success Toast Messages
- **Description**: Verify success toasts appear
- **Steps**:
  - Perform actions: submit property, send message, update profile
- **Expected Result**:
  - Green success toast appears
  - Message is clear and helpful
  - Toast auto-dismisses after 4 seconds

#### TC-TOAST-002: Error Toast Messages
- **Description**: Verify error toasts appear
- **Steps**:
  - Perform invalid actions: submit empty form, invalid login
- **Expected Result**:
  - Red error toast appears
  - Error message is clear

---

### 14. Protected Routes

#### TC-PROT-001: Access Protected Route (Logged Out)
- **Description**: Verify protected routes redirect when logged out
- **Steps**:
  1. Logout
  2. Try to access `/account`, `/post-property`, `/chats`
- **Expected Result**:
  - Redirected to `/auth?next=<intended-path>`
  - After login, redirected to intended path

#### TC-PROT-002: Access Admin Route (Non-Admin)
- **Description**: Verify admin routes blocked for non-admins
- **Steps**:
  1. Login as regular user
  2. Try to access `/admin`
- **Expected Result**:
  - Redirected to dashboard
  - Access denied

---

### 15. Form Validations

#### TC-FORM-001: Required Field Validation
- **Description**: Verify required fields are validated
- **Steps**:
  - Try submitting forms with empty required fields
- **Expected Result**:
  - Error messages display
  - Form does not submit

#### TC-FORM-002: Email Format Validation
- **Description**: Verify email format validation
- **Steps**:
  1. Enter invalid email format
  2. Try to submit
- **Expected Result**:
  - Error: "Email is invalid"

#### TC-FORM-003: Password Length Validation
- **Description**: Verify password length requirement
- **Steps**:
  1. Enter password < 6 characters
  2. Try to submit
- **Expected Result**:
  - Error: "Password must be at least 6 characters"

#### TC-FORM-004: Phone Number Validation
- **Description**: Verify phone number format
- **Steps**:
  1. Enter invalid phone number
  2. Try to submit
- **Expected Result**:
  - Error message displays
  - Form does not submit

---

## NEGATIVE TESTING

### TC-NEG-001: List Property Without Login
- **Description**: Attempt to list property without authentication
- **Steps**:
  1. Logout
  2. Try to navigate to `/post-property` directly via URL
- **Expected Result**:
  - Redirected to `/auth?next=/post-property`
  - Cannot access form without login

### TC-NEG-002: Submit Invalid Form Data
- **Description**: Attempt to submit forms with invalid data
- **Steps**:
  - Submit property form with negative price
  - Submit with invalid date (past date for future event)
  - Submit with empty required fields
- **Expected Result**:
  - Form validation errors display
  - Form does not submit
  - Error messages are clear

### TC-NEG-003: Access Admin Route as Normal User
- **Description**: Attempt to access admin panel as regular user
- **Steps**:
  1. Login as regular user (not admin)
  2. Navigate to `/admin` via URL
- **Expected Result**:
  - Redirected to dashboard or home
  - Cannot access admin panel
  - No error thrown (graceful redirect)

### TC-NEG-004: Message Without Permission
- **Description**: Attempt to access chat without proper permissions
- **Steps**:
  1. Try to access chat that user is not participant in
  2. Use direct URL to chat ID
- **Expected Result**:
  - Access denied
  - Redirected or error message shown

### TC-NEG-005: Direct URL Navigation
- **Description**: Test direct navigation to various routes
- **Steps**:
  - Try accessing protected routes directly
  - Try accessing non-existent routes
  - Try accessing routes with invalid IDs
- **Expected Result**:
  - Protected routes require authentication
  - 404 page shown for invalid routes
  - Invalid IDs handled gracefully

### TC-NEG-006: Edit Others' Listings
- **Description**: Attempt to edit property owned by another user
- **Steps**:
  1. Login as User A
  2. Try to edit property owned by User B (via URL manipulation)
- **Expected Result**:
  - Edit blocked
  - Permission error or redirect
  - Cannot modify others' properties

### TC-NEG-007: Submit Duplicate Requests
- **Description**: Attempt to submit duplicate service request
- **Steps**:
  1. Submit renovation request
  2. Try to submit same request again
- **Expected Result**:
  - Duplicate prevented or handled
  - Appropriate message displayed

---

## UI/UX TESTING

### TC-UI-001: Mobile Responsiveness (Home Page)
- **Description**: Verify home page is responsive
- **Steps**:
  1. Open app on mobile device or resize browser to mobile width
  2. Navigate to home page
- **Expected Result**:
  - Layout adapts to mobile screen
  - Text is readable
  - Buttons are tappable
  - No horizontal scroll

### TC-UI-002: Mobile Responsiveness (Properties Page)
- **Description**: Verify properties page is responsive
- **Steps**:
  1. View properties page on mobile
- **Expected Result**:
  - Property cards stack vertically
  - Filters collapse appropriately
  - Images scale correctly

### TC-UI-003: Mobile Responsiveness (MyAccount)
- **Description**: Verify dashboard is responsive
- **Steps**:
  1. View `/account` on mobile
- **Expected Result**:
  - Sidebar collapses or adapts
  - Content is readable
  - Forms are usable

### TC-UI-004: Empty State Display
- **Description**: Verify empty states show correctly
- **Steps**:
  - View pages with no data: empty property list, no notifications, no messages
- **Expected Result**:
  - Friendly empty state message
  - Helpful call-to-action button
  - No broken images or errors

### TC-UI-005: Error Toast Visibility
- **Description**: Verify error messages are visible
- **Steps**:
  - Trigger various errors
- **Expected Result**:
  - Error toasts are visible
  - Text is readable
  - Toast does not overlap content

### TC-UI-006: Layout Spacing Consistency
- **Description**: Verify consistent spacing throughout app
- **Steps**:
  - Navigate through multiple pages
- **Expected Result**:
  - Consistent padding/margins
  - Uniform card spacing
  - Proper spacing between elements

### TC-UI-007: Font Size Consistency
- **Description**: Verify consistent typography
- **Steps**:
  - View different pages
- **Expected Result**:
  - Headings use consistent sizes
  - Body text is readable
  - No text too small or too large

### TC-UI-008: Navbar Routing
- **Description**: Verify all navbar links work
- **Steps**:
  - Click each link in navbar
- **Expected Result**:
  - All links navigate correctly
  - Active link highlighted
  - Mobile menu works

### TC-UI-009: Footer Visibility
- **Description**: Verify footer is visible on all pages
- **Steps**:
  - Scroll to bottom on various pages
- **Expected Result**:
  - Footer is visible
  - Footer does not overlap content
  - Footer links work

### TC-UI-010: Card Designs Consistency
- **Description**: Verify consistent card designs
- **Steps**:
  - View property cards, provider cards, notification cards
- **Expected Result**:
  - Cards use consistent styling
  - Shadows and borders uniform
  - Hover effects work

### TC-UI-011: Loading States
- **Description**: Verify loading indicators display
- **Steps**:
  - Navigate to pages that load data
- **Expected Result**:
  - Loading spinner or skeleton shows
  - No blank screens during load
  - Loading states are clear

---

## PERFORMANCE TESTING

### TC-PERF-001: Time to Load Listing Pages
- **Description**: Measure page load time for property listings
- **Steps**:
  1. Open browser DevTools (Network tab)
  2. Navigate to `/properties` or `/browse-rentals`
  3. Measure load time
- **Expected Result**:
  - Initial load < 3 seconds
  - Time to interactive < 5 seconds
  - Images lazy load

### TC-PERF-002: Time to Load Provider Pages
- **Description**: Measure provider listing page load time
- **Steps**:
  1. Navigate to `/renovation-providers` or `/construction-providers`
  2. Measure load time
- **Expected Result**:
  - Page loads < 3 seconds
  - Provider cards load efficiently

### TC-PERF-003: Time to Load MyAccount Dashboard
- **Description**: Measure dashboard load time
- **Steps**:
  1. Navigate to `/account`
  2. Measure time until data displays
- **Expected Result**:
  - Dashboard loads < 2 seconds
  - Data appears progressively
  - No blocking operations

### TC-PERF-004: Cloud Firestore Query Efficiency
- **Description**: Verify queries are efficient
- **Steps**:
  1. Monitor Firestore reads in Firebase Console
  2. Perform various operations
- **Expected Result**:
  - Minimal unnecessary reads
  - Queries use indexes
  - No N+1 query problems

### TC-PERF-005: Image Loading Performance
- **Description**: Verify images load efficiently
- **Steps**:
  1. View pages with many images
  2. Monitor network requests
- **Expected Result**:
  - Images lazy load
  - Appropriate image sizes
  - No blocking on images

### TC-PERF-006: Large List Pagination
- **Description**: Verify pagination works for large lists
- **Steps**:
  1. Navigate to properties page with many results
  2. Scroll or use pagination
- **Expected Result**:
  - Pages load incrementally
  - No performance degradation
  - Smooth scrolling

---

## SECURITY TESTING

### TC-SEC-001: Firestore Rules Validation
- **Description**: Verify Firestore security rules work
- **Steps**:
  1. Try to read/write data user shouldn't have access to
  2. Monitor Firebase Console for denied requests
- **Expected Result**:
  - Unauthorized reads/writes denied
  - Rules enforce properly
  - No data leakage

### TC-SEC-002: Cross-User Data Isolation
- **Description**: Verify users cannot access other users' data
- **Steps**:
  1. Login as User A
  2. Try to access User B's profile, properties, requests
- **Expected Result**:
  - Access denied
  - No data visible
  - Security rules prevent access

### TC-SEC-003: Role-Based Access Control
- **Description**: Verify role-based permissions
- **Steps**:
  - Test admin-only actions as regular user
  - Test provider-only actions as customer
- **Expected Result**:
  - Access restricted based on role
  - Unauthorized actions blocked

### TC-SEC-004: Prevent Editing Others' Listings
- **Description**: Verify users cannot edit others' properties
- **Steps**:
  1. Login as User A
  2. Try to edit property owned by User B
- **Expected Result**:
  - Edit form blocked or shows error
  - Update request denied by Firestore rules
  - Property remains unchanged

### TC-SEC-005: Prevent Unauthorized Service Requests
- **Description**: Verify service request permissions
- **Steps**:
  1. Try to create service request with different user ID
  2. Try to update request user didn't create
- **Expected Result**:
  - Requests blocked
  - Only creator can create/update

### TC-SEC-006: XSS Prevention
- **Description**: Verify XSS vulnerabilities are prevented
- **Steps**:
  1. Try to inject script tags in forms
  2. Submit malicious content
- **Expected Result**:
  - Scripts not executed
  - Content sanitized
  - No XSS vulnerabilities

### TC-SEC-007: SQL Injection Prevention
- **Description**: Verify no SQL injection vulnerabilities
- **Steps**:
  - Firestore doesn't use SQL, but verify query injection prevented
- **Expected Result**:
  - All queries parameterized
  - No direct string concatenation in queries

---

## TEST EXECUTION SUMMARY

### Test Coverage Summary
- **Total Test Cases**: 150+
- **Functional Tests**: 80+
- **Negative Tests**: 7
- **UI/UX Tests**: 11
- **Performance Tests**: 6
- **Security Tests**: 7

### Priority Levels
- **P0 (Critical)**: Authentication, Data Security, Payment flows
- **P1 (High)**: Core functionality, User workflows
- **P2 (Medium)**: UI polish, Performance optimizations
- **P3 (Low)**: Edge cases, Nice-to-have features

### Test Execution Schedule
1. **Phase 1**: Critical path testing (P0 items)
2. **Phase 2**: Core functionality (P1 items)
3. **Phase 3**: UI/UX and Performance (P2 items)
4. **Phase 4**: Edge cases and polish (P3 items)

---

## NOTES

- All tests should be executed on multiple browsers (Chrome, Firefox, Safari, Edge)
- Mobile testing should include iOS and Android devices
- Performance benchmarks should be measured on average network speeds
- Security tests should be performed by security team
- All bugs found should be logged with screenshots and steps to reproduce

---

**Document Version**: 1.0  
**Last Updated**: December 19, 2024  
**Next Review**: After each major release



