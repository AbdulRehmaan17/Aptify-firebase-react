# 🔐 Admin Custom Claims Setup Guide

## Overview

Admin users need custom claims set in Firebase Auth to access admin features. This document explains how to set admin claims.

## Method 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `aptify-82cd6`
3. Navigate to **Authentication** → **Users**
4. Find the user you want to make admin
5. Click the **three dots** (⋮) → **Edit**
6. Scroll to **Custom Claims** section
7. Click **Add custom claim**
8. Enter:
   - **Key:** `admin`
   - **Value:** `true`
9. Click **Save**

**Important:** User must sign out and sign in again for changes to take effect.

## Method 2: Firebase Admin SDK Script

A script is provided at `scripts/set-admin-claims.js`

### Prerequisites:
1. Install Firebase Admin SDK:
   ```bash
   cd functions
   npm install firebase-admin
   ```

2. Get Service Account Key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

3. Set Environment Variable:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="path\to\service-account-key.json"
   
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

4. Run Script:
   ```bash
   node scripts/set-admin-claims.js admin@aptify.com
   ```

## Method 3: Firebase Functions (Recommended for Production)

Create a Cloud Function to set admin claims:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only allow existing admins to set new admin claims
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin claims');
  }

  const targetEmail = data.email;
  if (!targetEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { success: true, message: `Admin claim set for ${targetEmail}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Verification

After setting claims, verify in the app:

1. User must **sign out and sign in again**
2. Check browser console for: `Admin claim: true`
3. User should see admin panel access

## Frontend Check

The app checks for admin claims in `src/context/AuthContext.jsx`:

- Checks `getIdTokenResult()` for `claims.admin === true`
- Falls back to `userProfile.role === 'admin'` if no claim
- Updates `currentUserRole` accordingly

## Troubleshooting

**Issue:** Admin claim not working after setting
- **Solution:** User must sign out and sign in again
- **Solution:** Clear browser cache and cookies
- **Solution:** Check Firebase Console → Authentication → Users → Custom Claims

**Issue:** Script fails with "permission denied"
- **Solution:** Ensure service account has "Firebase Admin" role
- **Solution:** Check GOOGLE_APPLICATION_CREDENTIALS is set correctly

**Issue:** Frontend not detecting admin
- **Solution:** Check browser console for token errors
- **Solution:** Verify `getIdTokenResult()` is being called
- **Solution:** Check Firestore `userProfiles` collection has `role: 'admin'` as fallback

