# Admin Setup Instructions

## Setting Admin Custom Claims

To grant admin privileges to users, you have two options:

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **aptify-82cd6**
3. Navigate to **Authentication** → **Users**
4. Find the user you want to make admin
5. Click on the user → **Custom Claims** tab
6. Click **Add claim**
7. Enter:
   - **Key**: `admin`
   - **Value**: `true`
8. Click **Save**
9. **Important**: The user must **sign out and sign in again** for changes to take effect

### Option 2: Using Script (Requires Service Account)

1. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Get a service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

3. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="path\to\service-account-key.json"
   
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

4. Run the script:
   ```bash
   node scripts/set-admin-claims.js user@example.com
   ```

5. **Important**: User must sign out and sign in again

### Option 3: Using Cloud Function (If Deployed)

If you have deployed the `setAdminClaim` Cloud Function:

1. Call the function via HTTP:
   ```bash
   curl -X POST https://YOUR-REGION-aptify-82cd6.cloudfunctions.net/setAdminClaim \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com"}'
   ```

2. Or use Firebase CLI:
   ```bash
   firebase functions:call setAdminClaim --data '{"email": "user@example.com"}'
   ```

## Verifying Admin Status

After setting admin claims:

1. User must **sign out and sign in again**
2. Check browser console for: `Admin claim: true`
3. User should see admin panel access at `/admin`
4. Check Firestore rules will allow admin operations

## Troubleshooting

**Issue**: Admin claim not working after setting
- **Solution**: User must sign out and sign in again
- **Solution**: Clear browser cache and cookies
- **Solution**: Check Firebase Console → Authentication → Users → Custom Claims

**Issue**: Script fails with "permission denied"
- **Solution**: Ensure service account has "Firebase Admin" role
- **Solution**: Check GOOGLE_APPLICATION_CREDENTIALS is set correctly

**Issue**: Frontend not detecting admin
- **Solution**: Check browser console for token errors
- **Solution**: Verify `getIdTokenResult()` is being called in AuthContext
- **Solution**: Check Firestore `userProfiles` collection has `role: 'admin'` as fallback

## Admin Features

Once admin claims are set, users can:

- ✅ Accept/reject requests (construction, renovation, rental, buy/sell)
- ✅ Update request statuses
- ✅ Send messages to users via support chats
- ✅ Manage users, providers, and properties
- ✅ Send notifications to all users or specific groups
- ✅ View platform statistics and analytics

## Security Notes

- Admin claims are checked in Firestore security rules
- Rules check both `request.auth.token.admin == true` and `userProfiles.role == 'admin'`
- Always verify admin status before allowing sensitive operations
- Never expose admin credentials or service account keys in client code

