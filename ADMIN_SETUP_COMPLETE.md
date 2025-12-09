# Admin Setup Complete

## ✅ Firestore Rules Updated

The Firestore rules have been updated with the following changes:

### Requests Collection
- ✅ `allow read: if true` - Public read access
- ✅ `allow create: if request.auth != null` - Authenticated users can create
- ✅ `allow update: if request.auth.token.admin == true` - Only admins can update
- ✅ `allow delete: if request.auth.token.admin == true` - Only admins can delete

### Messages Collection
- ✅ `allow read: if request.auth != null` - Authenticated users can read
- ✅ `allow create: if request.auth != null` - Authenticated users can create
- ✅ `allow update: if request.auth.token.admin == true` - Only admins can update
- ✅ `allow delete: if request.auth.token.admin == true` - Only admins can delete

## 🔧 Setting Admin Custom Claims

To set the current logged-in user as admin, you have two options:

### Option 1: Using Script (Recommended)

1. **Get the current user's email** from the app (check the browser console or user profile)

2. **Set up service account** (if not already done):
   ```bash
   # Download service account key from Firebase Console
   # Project Settings → Service Accounts → Generate New Private Key
   ```

3. **Set environment variable**:
   ```powershell
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="path\to\service-account-key.json"
   ```

4. **Run the script**:
   ```bash
   node scripts/set-current-user-admin.js user@example.com
   ```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **aptify-82cd6**
3. Navigate to **Authentication** → **Users**
4. Find the user you want to make admin
5. Click on the user → **Custom Claims** tab
6. Click **Add claim**
7. Enter:
   - **Key**: `admin`
   - **Value**: `true`
8. Click **Save**

## 🔄 Refreshing ID Token

After setting admin claims, the user **must** sign out and sign in again for the changes to take effect.

The ID token needs to be refreshed to include the new custom claim. The app's `AuthContext` will automatically check for admin claims on login.

## ✅ Verification

To verify admin claims are working:

1. **Check browser console** after login:
   - Look for: `Admin claim: true` in console logs
   - Or check: `currentUserRole === 'admin'`

2. **Test admin actions**:
   - Try to update/delete a request in the "requests" collection
   - Try to update/delete a message in the "messages" collection
   - These should work if admin claims are set correctly

## 📝 Notes

- Admin claims are checked in Firestore rules using `request.auth.token.admin == true`
- The app also checks `userProfiles.role == 'admin'` as a fallback
- Custom claims take precedence over userProfiles role
- Users must sign out and sign in again after setting claims

## 🚀 Next Steps

1. ✅ Firestore rules have been updated
2. ⚠️  Set admin claims for your user (see above)
3. ⚠️  Sign out and sign in again
4. ✅ Test admin functionalities

---

**Files Modified:**
- `firestore.rules` - Updated requests and messages collection rules
- `scripts/set-current-user-admin.js` - Created admin setup script

