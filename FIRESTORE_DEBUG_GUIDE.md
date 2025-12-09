# Firestore Data Not Displaying - Debug Guide

## Quick Fixes

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for errors:
- Look for `permission-denied` errors
- Look for `failed-precondition` errors (index missing)
- Look for `Firestore not initialized` errors

### 2. Verify Firebase Configuration
Check if `.env.local` or `.env` file exists with:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Check Firestore Security Rules
The rules require:
- **Properties**: Public read access (should work)
- **Other collections**: Authentication required

### 4. Common Issues & Solutions

#### Issue: "Permission Denied"
**Solution**: 
- Make sure user is logged in for authenticated collections
- Check Firestore rules in Firebase Console
- Verify rules allow the query you're making

#### Issue: "Index Required" or "failed-precondition"
**Solution**:
- Check browser console for index creation link
- Click the link to create the index in Firebase Console
- Or update `firestore.indexes.json` and deploy

#### Issue: "Firestore not initialized"
**Solution**:
- Check environment variables are set
- Restart dev server after adding .env file
- Verify Firebase config in `src/firebase/config.js`

#### Issue: Data exists but not showing
**Possible causes**:
1. **Status filter**: Properties must have `status: 'published'`
2. **Collection name mismatch**: Check collection names match exactly
3. **Field names**: Check field names match (e.g., `userId` vs `clientId`)

### 5. Run Diagnostics
The app now includes automatic diagnostics. Check browser console for:
```
🔍 Firebase Diagnostics Report
```

### 6. Manual Test
Open browser console and run:
```javascript
// Test properties query
import { testPropertiesQuery } from './src/utils/debugFirestore';
testPropertiesQuery();
```

### 7. Check Firestore Console
1. Go to Firebase Console
2. Open Firestore Database
3. Verify:
   - Collections exist
   - Documents have correct field names
   - Status fields are set correctly

### 8. Authentication Check
For authenticated collections:
- Make sure user is logged in
- Check `auth.currentUser` is not null
- Verify user has correct role/permissions

## Debugging Steps

1. **Check Console Errors**: Look for specific error messages
2. **Verify Firebase Init**: Check if `db` is initialized
3. **Test Simple Query**: Try querying without filters
4. **Check Rules**: Verify Firestore rules allow the query
5. **Check Data**: Verify data exists in Firestore Console
6. **Check Field Names**: Ensure field names match exactly

## Quick Test Commands

In browser console:
```javascript
// Check if Firebase is initialized
import { db, auth } from './src/firebase';
console.log('DB:', db);
console.log('Auth:', auth);
console.log('Current User:', auth?.currentUser);

// Test simple query
import { collection, getDocs, limit, query } from 'firebase/firestore';
const q = query(collection(db, 'properties'), limit(1));
getDocs(q).then(snap => console.log('Properties count:', snap.docs.length));
```

## Still Not Working?

1. Check `cursor-diagnostics/` folder for error logs
2. Share browser console errors
3. Share Firestore rules
4. Share sample document structure from Firestore Console

