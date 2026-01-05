# Firestore Rules Fix for Admin Replies

## Problem
Admin was getting "Permission denied" when trying to reply to Contact Us messages.

## Root Cause
The Firestore rules only checked for admin custom claim (`request.auth.token.admin == true`). If the admin doesn't have the custom claim set (or the ID token hasn't been refreshed), the rules would deny access even if the user has `role: 'admin'` in their user profile.

## Solution
Added a fallback check that verifies admin status by reading from the `users` collection. Now admins can reply if they have:
1. Custom claim: `request.auth.token.admin == true` (preferred method)
2. OR role field: `users/{uid}.role == 'admin'` (fallback)

## Changes Made

### 1. Added Helper Function
```javascript
// Helper function to check if user is admin via users collection (fallback)
function isAdminByRole(userId) {
  let userDoc = get(/databases/$(database)/documents/users/$(userId));
  return userDoc.data != null && userDoc.data.role == 'admin';
}
```

### 2. Updated supportMessages Rules
All admin checks in the `supportMessages` collection now use both methods:
- `isAdmin()` - Checks custom claim (fast, preferred)
- `isAdminByRole(request.auth.uid)` - Checks user document role (fallback)

### 3. Rules Structure
```javascript
match /supportMessages/{messageId} {
  // Read: User who created OR admin (by claim or role)
  allow read: if isAuthenticated() && 
                 (resource.data.userId == request.auth.uid || 
                  isAdmin() || 
                  isAdminByRole(request.auth.uid));
  
  // Create: Authenticated users (must set userId to their own uid)
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
  
  // Update/Delete: Admin only (by claim or role)
  allow update: if isAdmin() || isAdminByRole(request.auth.uid);
  allow delete: if isAdmin() || isAdminByRole(request.auth.uid);

  match /replies/{replyId} {
    // Read: Message creator OR admin (by claim or role)
    allow read: if isAuthenticated() && 
                   (get(/databases/$(database)/documents/supportMessages/$(messageId)).data.userId == request.auth.uid || 
                    isAdmin() || 
                    isAdminByRole(request.auth.uid));
    
    // Create: Admin only (by claim or role)
    allow create: if isAuthenticated() && 
                     (isAdmin() || isAdminByRole(request.auth.uid));
    
    // Update/Delete: Admin only (by claim or role)
    allow update, delete: if isAdmin() || isAdminByRole(request.auth.uid);
  }
}
```

## Important Notes

1. **Performance**: The fallback check (`isAdminByRole`) requires an extra Firestore read operation. This is acceptable as a fallback, but setting custom claims is preferred for better performance.

2. **Custom Claims (Recommended)**: For best performance and security, admins should have custom claims set:
   - Go to Firebase Console → Authentication → Users
   - Select admin user → Custom Claims → Add: `admin = true`
   - User must sign out and sign in again to refresh ID token

3. **Users Collection Read Permission**: The fallback requires read access to the `users` collection. The generic fallback rule (`allow read: if true`) ensures this works.

4. **Deployment Required**: These rule changes must be deployed to Firebase for them to take effect.

## Testing

After deploying the rules:
1. Admin should be able to reply to Contact Us messages
2. Non-admin users should still be able to create Contact Us messages
3. Non-admin users should be able to read their own messages and replies
4. Non-admin users should NOT be able to reply to messages

## Files Modified

- `firestore.rules` - Added `isAdminByRole()` helper and updated `supportMessages` rules


