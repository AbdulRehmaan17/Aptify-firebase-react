# Firestore Permissions Fix for User Profile Updates

## Issue
Users were getting "Missing or insufficient permissions" error when trying to update their profile in My Account.

## Root Cause
The Firestore security rules were using helper functions that could fail:
1. The `isAdmin()` function tried to read the user document, which could cause permission issues
2. The rules weren't explicit enough about allowing users to update their own profiles

## Fix Applied

### Updated `firestore.rules`

1. **Improved `isAdmin()` function**:
   - Added `exists()` check before reading document to prevent errors

2. **Simplified Users Collection Rules**:
   - Changed from helper functions to direct `request.auth.uid == userId` checks
   - This ensures users can always update their own profiles without needing admin check
   - Admin check is only used for non-owner operations

### Before:
```javascript
allow update: if isAuthenticated() && (isOwner(userId) || isAdmin());
```

### After:
```javascript
allow update: if isAuthenticated() && 
                 (request.auth.uid == userId || isAdmin());
```

## Why This Works

1. **Direct UID Check**: `request.auth.uid == userId` is a simple comparison that doesn't require reading any documents
2. **No Circular Dependencies**: Checking ownership directly avoids the need to read the user document during update
3. **Admin Fallback**: If user is not the owner, only then we check if they're admin

## Next Steps

1. **Deploy the Rules**: Make sure to deploy the updated `firestore.rules` to Firebase
2. **Test**: Try updating your profile in My Account to verify the fix works
3. **Monitor**: Check Firebase Console logs if any issues persist

## Deployment Command

If using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

Or deploy through Firebase Console:
1. Go to Firebase Console > Firestore Database > Rules
2. Copy the updated rules
3. Click "Publish"

## Testing

After deploying, users should be able to:
- ✅ Update their display name
- ✅ Update their phone number
- ✅ Update their address
- ✅ Update their profile picture
- ✅ Update other allowed fields in their profile

