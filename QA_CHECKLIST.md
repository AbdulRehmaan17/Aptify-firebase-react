# Aptify Web App - QA Testing Checklist

## Overview
This checklist provides comprehensive manual testing steps to validate all critical flows in the Aptify web application.

---

## 1. AUTHENTICATION MODULE

### Test Case: TC-AUTH-001 - Email/Password Signup
**Steps:**
1. Navigate to `/auth`
2. Click "Sign Up" tab
3. Fill in: name, email, password, confirm password
4. Click "Sign Up"
5. Check for success toast
6. Verify redirect to `/account` or `?next=` path

**Expected Result:** User account created, profile created in Firestore, redirected appropriately

---

### Test Case: TC-AUTH-002 - Email/Password Login
**Steps:**
1. Navigate to `/auth`
2. Enter registered email and password
3. Click "Sign In"
4. Check for success toast
5. Verify redirect

**Expected Result:** User logged in, redirected to intended page

---

### Test Case: TC-AUTH-003 - Google Sign-In
**Steps:**
1. Navigate to `/auth`
2. Click "Sign in with Google"
3. Complete Google authentication
4. Verify redirect after authentication

**Expected Result:** User logged in with Google, profile created/updated, redirected appropriately

---

### Test Case: TC-AUTH-004 - Logout
**Steps:**
1. While logged in, click logout (in Navbar)
2. Verify redirect to home page
3. Try accessing `/account` directly

**Expected Result:** User logged out, redirected to home, protected routes redirect to auth

---

### Test Case: TC-AUTH-005 - Protected Route Redirect
**Steps:**
1. While logged out, navigate to `/account`
2. Verify redirect to `/auth?next=/account`
3. After login, verify redirect back to `/account`

**Expected Result:** Proper redirect flow with `?next=` parameter preserved

---

## 2. USER DASHBOARD (MYACCOUNT)

### Test Case: TC-DASH-001 - Dashboard Load
**Steps:**
1. Log in as a user
2. Navigate to `/account`
3. Verify all summary cards load (Properties, Requests, Reviews, Messages)
4. Check for loading spinners during data fetch

**Expected Result:** Dashboard loads with correct counts, no footer overlap

---

### Test Case: TC-DASH-002 - Profile Tab
**Steps:**
1. Go to `/account`
2. Click "Profile" tab
3. Verify profile information displays
4. Click "Edit" button
5. Update profile fields
6. Save changes
7. Verify toast success message

**Expected Result:** Profile displays correctly, edits save successfully

---

### Test Case: TC-DASH-003 - My Listings Tab
**Steps:**
1. Go to `/account` → "Properties" tab
2. Verify user's properties list
3. Click "Post New Property"
4. Verify redirect to `/post-property`

**Expected Result:** Properties list displays, empty state shows if no properties

---

### Test Case: TC-DASH-004 - Requests Tab
**Steps:**
1. Go to `/account` → "Requests" tab
2. Verify service requests display
3. Check loading states

**Expected Result:** Requests list displays with proper status indicators

---

### Test Case: TC-DASH-005 - Messages Tab
**Steps:**
1. Go to `/account` → "Messages" tab
2. Verify chat conversations list
3. Click on a chat
4. Verify redirect to chat page

**Expected Result:** Chat list displays, navigation works

---

### Test Case: TC-DASH-006 - Footer Overlap Fix
**Steps:**
1. Go to `/account`
2. Scroll to bottom of any tab
3. Verify footer does not overlap content
4. Check sidebar scrolling works

**Expected Result:** Footer visible, no overlap, sidebar scrolls if needed

---

## 3. RENTAL MODULE

### Test Case: TC-RENT-001 - List Property Button
**Steps:**
1. Navigate to `/rental-services`
2. Click "List a Property for Rent" button
3. If not logged in, verify redirect to `/auth?next=/post-property?type=rent`
4. After login, verify redirect to post-property form

**Expected Result:** Proper auth flow with profile validation

---

### Test Case: TC-RENT-002 - Browse Rentals
**Steps:**
1. Navigate to `/browse-rentals`
2. Verify properties list loads
3. Check filters work (price, location, etc.)
4. Click on a property
5. Verify property detail page loads

**Expected Result:** Properties display, filters work, detail page loads

---

### Test Case: TC-RENT-003 - Post Rental Property
**Steps:**
1. Log in
2. Navigate to `/post-property?type=rent`
3. Fill in property form
4. Upload images
5. Submit form
6. Verify success toast
7. Verify redirect to `/account`

**Expected Result:** Property created, toast shown, redirect works

---

### Test Case: TC-RENT-004 - Rental Request
**Steps:**
1. Browse to a rental property
2. Click "Request Rental"
3. Fill in request form
4. Submit
5. Verify notification sent to owner

**Expected Result:** Request created, owner notified

---

## 4. RENOVATION MODULE

### Test Case: TC-RENO-001 - Browse Renovation Providers
**Steps:**
1. Navigate to `/renovation-providers`
2. Verify only Renovation providers show (not Construction)
3. Check provider cards display correctly
4. Click on a provider
5. Verify provider detail page

**Expected Result:** Only Renovation providers listed, detail page works

---

### Test Case: TC-RENO-002 - Submit Renovation Request
**Steps:**
1. Log in
2. Navigate to `/renovation-request`
3. Fill in request form
4. Select property (if applicable)
5. Submit
6. Verify success toast and redirect

**Expected Result:** Request created, providers notified, redirect to `/account`

---

## 5. CONSTRUCTION MODULE

### Test Case: TC-CONST-001 - Browse Construction Providers
**Steps:**
1. Navigate to `/construction-providers`
2. Verify only Construction providers show
3. Check provider cards display
4. Click on a provider
5. Verify provider detail page

**Expected Result:** Only Construction providers listed

---

### Test Case: TC-CONST-002 - Submit Construction Request
**Steps:**
1. Log in
2. Navigate to `/construction-request`
3. Fill in request form
4. Submit
5. Verify success toast and redirect

**Expected Result:** Request created, redirect works

---

## 6. BUY & SELL MODULE

### Test Case: TC-BUYSELL-001 - Browse Buy/Sell Properties
**Steps:**
1. Navigate to `/buy`
2. Verify properties for sale display
3. Check filters work
4. Click on a property
5. Verify detail page

**Expected Result:** Properties display correctly

---

### Test Case: TC-BUYSELL-002 - Post Property for Sale
**Steps:**
1. Log in
2. Navigate to `/post-property?type=sale`
3. Fill in form
4. Submit
5. Verify success and redirect

**Expected Result:** Property posted, redirect to `/account`

---

### Test Case: TC-BUYSELL-003 - Submit Offer
**Steps:**
1. Browse to a property for sale
2. Click "Make Offer"
3. Fill in offer form
4. Submit
5. Verify seller notified

**Expected Result:** Offer created, seller notified

---

## 7. CHAT MODULE

### Test Case: TC-CHAT-001 - View Chat List
**Steps:**
1. Log in
2. Navigate to `/chats`
3. Verify conversation list loads
4. Check unread counts display
5. Click on a conversation

**Expected Result:** Chat list displays, unread counts correct

---

### Test Case: TC-CHAT-002 - Send Message
**Steps:**
1. Open a chat conversation
2. Type a message
3. Send message
4. Verify message appears in real-time
5. Verify other user receives notification

**Expected Result:** Message sent, appears immediately, notification sent

---

### Test Case: TC-CHAT-003 - Real-time Updates
**Steps:**
1. Open chat in two browser windows (different users)
2. Send message from one window
3. Verify message appears in other window without refresh

**Expected Result:** Real-time updates work correctly

---

## 8. NOTIFICATIONS MODULE

### Test Case: TC-NOTIF-001 - View Notifications
**Steps:**
1. Log in
2. Click notification bell in Navbar
3. Verify notifications list displays
4. Check unread count badge

**Expected Result:** Notifications display, unread count correct

---

### Test Case: TC-NOTIF-002 - Mark as Read
**Steps:**
1. Open notifications
2. Click on an unread notification
3. Verify it marks as read
4. Check unread count decreases

**Expected Result:** Notification marked as read, count updates

---

### Test Case: TC-NOTIF-003 - Clear All
**Steps:**
1. Open notifications
2. Click "Clear All"
3. Verify all notifications removed
4. Verify unread count resets

**Expected Result:** All notifications cleared

---

## 9. ADMIN PANEL

### Test Case: TC-ADMIN-001 - Admin Access
**Steps:**
1. Log in as admin user
2. Navigate to `/admin`
3. Verify admin panel loads
4. Log in as regular user
5. Try to access `/admin`
6. Verify redirect

**Expected Result:** Only admins can access admin panel

---

### Test Case: TC-ADMIN-002 - Approve Property
**Steps:**
1. Log in as admin
2. Go to `/admin` → Properties tab
3. Find a pending property
4. Click "Approve"
5. Verify status changes to "approved"
6. Verify owner notified

**Expected Result:** Property approved, owner notified

---

### Test Case: TC-ADMIN-003 - Approve Provider
**Steps:**
1. Log in as admin
2. Go to `/admin` → Providers tab
3. Find a pending provider
4. Click "Approve"
5. Verify status changes
6. Verify provider notified

**Expected Result:** Provider approved, notification sent

---

## 10. REVIEWS & RATINGS

### Test Case: TC-REVIEW-001 - Submit Review
**Steps:**
1. Log in
2. Navigate to a completed service/property
3. Click "Write Review"
4. Fill in rating and review text
5. Submit
6. Verify review appears

**Expected Result:** Review submitted, displays correctly

---

### Test Case: TC-REVIEW-002 - View Reviews
**Steps:**
1. Navigate to a property/provider page
2. Scroll to reviews section
3. Verify reviews display
4. Check average rating calculation

**Expected Result:** Reviews display, average rating correct

---

## 11. WISHLIST

### Test Case: TC-WISH-001 - Add to Wishlist
**Steps:**
1. Log in
2. Browse to a property
3. Click "Add to Wishlist"
4. Navigate to `/wishlist`
5. Verify property appears

**Expected Result:** Property added to wishlist

---

### Test Case: TC-WISH-002 - Remove from Wishlist
**Steps:**
1. Go to `/wishlist`
2. Click "Remove" on an item
3. Verify item removed
4. Verify toast notification

**Expected Result:** Item removed, list updates

---

## 12. GLOBAL SEARCH

### Test Case: TC-SEARCH-001 - Search Properties
**Steps:**
1. Use search bar in Navbar
2. Type property search term
3. Verify results display
4. Click on a result
5. Verify correct property page loads

**Expected Result:** Search works, results accurate

---

### Test Case: TC-SEARCH-002 - Search Providers
**Steps:**
1. Use search bar
2. Type provider name
3. Verify provider results
4. Click on a result

**Expected Result:** Provider search works

---

## 13. NEGATIVE TESTING

### Test Case: TC-NEG-001 - Access Protected Route Without Login
**Steps:**
1. Log out
2. Navigate directly to `/account`
3. Verify redirect to `/auth?next=/account`

**Expected Result:** Redirect works, preserves intended destination

---

### Test Case: TC-NEG-002 - Submit Invalid Form
**Steps:**
1. Try to submit property form with empty required fields
2. Verify validation errors display
3. Verify form does not submit

**Expected Result:** Validation works, form blocked

---

### Test Case: TC-NEG-003 - Access Admin as Regular User
**Steps:**
1. Log in as regular user
2. Try to access `/admin`
3. Verify redirect

**Expected Result:** Access denied, redirect to appropriate page

---

### Test Case: TC-NEG-004 - Edit Others' Property
**Steps:**
1. Log in as User A
2. Try to edit a property owned by User B
3. Verify access denied

**Expected Result:** Cannot edit others' properties

---

## 14. UI/UX TESTING

### Test Case: TC-UI-001 - Mobile Responsiveness
**Steps:**
1. Open app on mobile device (or resize browser)
2. Test all major pages
3. Verify layout adapts correctly
4. Check buttons/links are tappable

**Expected Result:** All pages responsive, mobile-friendly

---

### Test Case: TC-UI-002 - Loading States
**Steps:**
1. Navigate to pages with data loading
2. Verify loading spinners display
3. Verify empty states show only after loading completes

**Expected Result:** Loading states visible, no premature empty states

---

### Test Case: TC-UI-003 - Toast Notifications
**Steps:**
1. Perform various actions (submit forms, etc.)
2. Verify success/error toasts appear
3. Verify toasts auto-dismiss

**Expected Result:** Toasts display correctly, dismiss properly

---

### Test Case: TC-UI-004 - Navbar Routing
**Steps:**
1. Click all Navbar links
2. Verify correct pages load
3. Check active state highlighting

**Expected Result:** All links work, active states correct

---

## 15. PERFORMANCE TESTING

### Test Case: TC-PERF-001 - Page Load Times
**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to key pages
3. Measure load times
4. Check for slow queries

**Expected Result:** Pages load within acceptable time (< 3s)

---

### Test Case: TC-PERF-002 - Firestore Query Efficiency
**Steps:**
1. Open Firestore console
2. Monitor query reads during page loads
3. Verify indexes are used (no failed-precondition errors)

**Expected Result:** Queries efficient, indexes used

---

## 16. SECURITY TESTING

### Test Case: TC-SEC-001 - Firestore Rules Validation
**Steps:**
1. Try to read another user's private data via browser console
2. Try to update another user's property
3. Verify Firestore rules block unauthorized access

**Expected Result:** Rules enforce proper access control

---

### Test Case: TC-SEC-002 - Cross-User Data Isolation
**Steps:**
1. Log in as User A
2. Verify only User A's data visible
3. Log in as User B
4. Verify User B's data separate

**Expected Result:** Data properly isolated per user

---

## TESTING NOTES

- **Test Environment:** Local development (`npm run dev`)
- **Browser:** Test in Chrome, Firefox, Safari, Edge
- **Mobile:** Test on iOS and Android devices
- **Firestore:** Ensure indexes are deployed before testing queries
- **Authentication:** Use test accounts for different roles (admin, user, provider)

---

## SIGN-OFF

- [ ] All Authentication tests passed
- [ ] All Dashboard tests passed
- [ ] All Module tests passed
- [ ] All Negative tests passed
- [ ] All UI/UX tests passed
- [ ] Performance acceptable
- [ ] Security validated

**Tester:** _________________  
**Date:** _________________  
**Status:** ☐ PASS  ☐ FAIL  ☐ PARTIAL



