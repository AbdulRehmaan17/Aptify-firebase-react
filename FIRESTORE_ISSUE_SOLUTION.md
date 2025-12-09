# Firestore Data Not Displaying - Solution Guide

## 🔍 Diagnostic Tool Added

I've added an automatic diagnostic tool that will run when you start the dev server. It will check:
- ✅ Firebase initialization
- ✅ User authentication
- ✅ Firestore connection
- ✅ Test queries

**To see diagnostics:**
1. Open browser console (F12)
2. Look for diagnostic output (runs automatically after 3 seconds)
3. Or manually run: `window.runFirestoreDiagnostics()`

## 🚨 Most Likely Causes

### 1. User Not Authenticated (MOST COMMON)
**Problem:** Most Firestore rules require authentication (`isAuthenticated()`)

**Check:**
- Are you logged in?
- Check console: `auth?.currentUser?.uid`

**Fix:**
- Log in to the app
- Or temporarily allow public reads (development only - see below)

### 2. Firestore Rules Too Restrictive
**Problem:** Rules block reads even for authenticated users

**Check Firestore Rules:**
- Properties: Should allow `allow read: if true;` (public)
- Other collections: Require authentication

**Quick Fix (Development Only):**
Add this to `firestore.rules` at the top level (before the default deny):
```javascript
// TEMPORARY - Development only
match /{document=**} {
  allow read: if request.auth != null; // Allow all reads for authenticated users
}
```

Then deploy:
```bash
firebase deploy --only firestore:rules
```

### 3. Missing Firestore Indexes
**Problem:** Queries fail with `failed-precondition` error

**Fix:**
- Check browser console for index creation link
- Click link to create index
- Or deploy: `firebase deploy --only firestore:indexes`

### 4. Database Not Initialized
**Problem:** `db` is null

**Check:**
- `.env.local` file exists
- All `VITE_FIREBASE_*` variables are set
- Firebase config is correct

## 🔧 Quick Fixes

### Fix 1: Temporarily Allow All Reads (Development)
**WARNING: Only for development!**

Update `firestore.rules`:
```javascript
match /{document=**} {
  allow read: if true; // TEMPORARY - Allow all reads
  allow write: if request.auth != null; // Still require auth for writes
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

### Fix 2: Check Authentication
In browser console:
```javascript
import { auth } from './firebase';
console.log('User:', auth?.currentUser?.uid);
```

If null, log in first.

### Fix 3: Test Simple Query
In browser console:
```javascript
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

// Test properties (should be public)
getDocs(collection(db, 'properties')).then(snap => {
  console.log('Properties found:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
}).catch(err => {
  console.error('Error:', err.code, err.message);
});
```

## 📋 Step-by-Step Debugging

1. **Open Browser Console (F12)**
   - Look for errors
   - Check diagnostic output

2. **Check Authentication**
   - Are you logged in?
   - Check `auth.currentUser`

3. **Run Diagnostic Tool**
   ```javascript
   window.runFirestoreDiagnostics()
   ```

4. **Check Specific Error**
   - `permission-denied` → Rules or auth issue
   - `failed-precondition` → Missing index
   - `Firestore db is not initialized` → Config issue

5. **Test Simple Query**
   - Try fetching properties (public collection)
   - If that works, issue is with other collections/rules

## 🎯 Next Steps

1. **Restart dev server** to see diagnostic output
2. **Check browser console** for specific errors
3. **Run diagnostic tool** manually if needed
4. **Share diagnostic output** if issue persists

The diagnostic tool will automatically identify the exact problem!


