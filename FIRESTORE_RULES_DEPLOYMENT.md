# Firestore Rules Deployment Guide

## Issue
Properties collection was returning "Permission denied" errors even though rules appeared correct.

## Root Cause
The rules used `allow read: if true;` which should work, but Firestore sometimes requires explicit `get` and `list` permissions for collection queries.

## Fix Applied
Updated `firestore.rules` to explicitly allow both operations:

```javascript
match /properties/{propertyId} {
  allow get: if true;  // Allow reading individual documents
  allow list: if true; // Allow listing/querying the collection
  allow write: if request.auth != null;
}
```

## Deployment Steps

### Option 1: Firebase CLI (Recommended)
```bash
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to: Firestore Database > Rules
4. Copy the contents of `firestore.rules`
5. Paste into the rules editor
6. Click "Publish"

## Verification
After deployment, test by:
1. Opening the app
2. Navigating to `/properties` page
3. Properties should load without permission errors

## Current Rules Summary
- ✅ `properties` - Public read (get + list), authenticated write
- ✅ `rentalListings` - Public read (get + list), authenticated write
- ✅ `userProfiles` - Owner-only read/write
- ✅ `users` - Owner-only read/write
- ✅ `notifications` - Authenticated read/write
- ✅ `savedProperties` - Authenticated read/write
- ✅ `serviceProviders` - Public read (get + list), authenticated write

## Troubleshooting
If permission errors persist after deployment:
1. Check Firebase Console > Firestore > Rules to verify rules are deployed
2. Check browser console for specific error codes
3. Verify Firebase project is correctly configured in `.env.local`
4. Clear browser cache and reload


