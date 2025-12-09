# Firestore Data Not Displaying - Diagnostic Checklist

## ✅ Step-by-Step Diagnosis

### Step 1: Check Browser Console (F12)
Open DevTools → Console tab and look for:
- [ ] `permission-denied` errors
- [ ] `failed-precondition` errors  
- [ ] `Firestore db is not initialized` errors
- [ ] Any red error messages

**Action:** Note down the exact error codes and messages

### Step 2: Run Diagnostic Tool
The diagnostic tool runs automatically, but you can also run manually:

In browser console:
```javascript
window.runFirestoreDiagnostics()
```

**Check output for:**
- [ ] Firebase initialized: ✅ or ❌
- [ ] User authenticated: ✅ or ❌
- [ ] Test queries: Which ones pass/fail?

### Step 3: Verify Authentication
```javascript
// In browser console
import { auth } from './firebase';
console.log('User:', auth?.currentUser?.uid);
console.log('Email:', auth?.currentUser?.email);
```

**Expected:** Should show user ID and email if logged in
**If null:** You need to log in first

### Step 4: Test Simple Query
```javascript
// In browser console
import { db } from './firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

// Test properties (public - should work even without login)
getDocs(collection(db, 'properties')).then(snap => {
  console.log('✅ Properties found:', snap.size);
  if (snap.size > 0) {
    snap.forEach(doc => {
      console.log('Property:', doc.id, doc.data().title || 'No title');
    });
  }
}).catch(err => {
  console.error('❌ Error:', err.code, err.message);
});
```

**Expected:** Should return properties even without login
**If fails:** Firebase config or rules issue

### Step 5: Check Firestore Rules
Review `firestore.rules`:
- [ ] Properties: `allow read: if true;` (public)
- [ ] Other collections: Require `isAuthenticated()`

### Step 6: Check Environment Variables
Verify `.env.local` exists with:
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`

## 🔧 Quick Fixes Based on Error

### Error: `permission-denied`
**Cause:** User not authenticated OR rules blocking

**Fix:**
1. Log in to the app
2. Or temporarily allow reads (development only):
   ```javascript
   // In firestore.rules, add before default deny:
   match /{document=**} {
     allow read: if request.auth != null;
   }
   ```

### Error: `failed-precondition`
**Cause:** Missing Firestore index

**Fix:**
1. Click the link in the error message
2. Create index in Firebase Console
3. Or deploy: `firebase deploy --only firestore:indexes`

### Error: `Firestore db is not initialized`
**Cause:** Firebase config missing

**Fix:**
1. Check `.env.local` file exists
2. Verify all `VITE_FIREBASE_*` variables are set
3. Restart dev server: `npm run dev`

### No Error But No Data
**Possible Causes:**
1. Collection is empty (check Firebase Console)
2. Data filtered out (check status filters)
3. Component not processing data correctly

**Fix:**
1. Check Firebase Console → Firestore → Collections
2. Verify data exists
3. Check component console logs

## 📊 Diagnostic Output Interpretation

### ✅ All Checks Pass
- Firebase: ✅
- Auth: ✅  
- Queries: ✅
→ Issue is in component code or data processing

### ❌ Permission Denied
→ User not logged in OR rules too restrictive
→ **Action:** Log in or update rules

### ❌ Failed Precondition
→ Missing index
→ **Action:** Create index (link in error)

### ❌ DB Not Initialized
→ Config issue
→ **Action:** Check environment variables

## 🚀 Next Steps

1. **Run diagnostics** (automatic or manual)
2. **Check console** for specific errors
3. **Share diagnostic output** if issue persists
4. **Try quick fixes** based on error type

The diagnostic tool will identify the exact problem!


