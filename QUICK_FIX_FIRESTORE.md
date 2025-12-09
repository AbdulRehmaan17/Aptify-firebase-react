# Quick Fix: Firestore Data Not Displaying

## Immediate Steps

### 1. Check Browser Console (F12)
Look for these errors:
- `permission-denied` → Authentication or rules issue
- `failed-precondition` → Missing Firestore index
- `Firestore db is not initialized` → Firebase config issue

### 2. Run Diagnostic Tool
Open browser console and run:
```javascript
window.runFirestoreDiagnostics()
```

This will check:
- ✅ Firebase initialization
- ✅ User authentication
- ✅ Firestore connection
- ✅ Test queries on key collections

### 3. Most Common Issues

#### Issue A: User Not Logged In
**Symptom:** No data, `permission-denied` errors

**Fix:**
1. Log in to the app
2. Check if `currentUser` exists in AuthContext
3. Verify authentication is working

#### Issue B: Firestore Rules Blocking
**Symptom:** `permission-denied` errors even when logged in

**Quick Fix (Development Only):**
Temporarily update `firestore.rules`:
```javascript
match /{document=**} {
  allow read: if request.auth != null; // Allow all reads for authenticated users
  allow write: if request.auth != null; // Allow all writes for authenticated users
}
```

**Then deploy:**
```bash
firebase deploy --only firestore:rules
```

#### Issue C: Missing Indexes
**Symptom:** `failed-precondition` errors

**Fix:**
1. Check browser console for index creation link
2. Click the link to create index in Firebase Console
3. Or deploy indexes: `firebase deploy --only firestore:indexes`

#### Issue D: Database Not Initialized
**Symptom:** `Firestore db is not initialized`

**Fix:**
1. Check `.env.local` file exists
2. Verify all `VITE_FIREBASE_*` variables are set
3. Restart dev server: `npm run dev`

### 4. Verify Authentication State
In browser console:
```javascript
// Check if user is authenticated
import { auth } from './firebase';
console.log('Current user:', auth?.currentUser?.uid);
console.log('User email:', auth?.currentUser?.email);
```

### 5. Test Simple Query
In browser console:
```javascript
import { db } from './firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

// Test properties (public read)
const test = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'properties'));
    console.log('Properties found:', snapshot.size);
    snapshot.forEach(doc => {
      console.log('Property:', doc.id, doc.data());
    });
  } catch (error) {
    console.error('Error:', error.code, error.message);
  }
};
test();
```

## Diagnostic Output Interpretation

### ✅ All Green
- Firebase initialized
- User authenticated
- Queries working
→ Check component code for data processing issues

### ❌ Permission Denied
→ User not authenticated OR Firestore rules blocking
→ Fix: Log in or update rules

### ❌ Failed Precondition
→ Missing Firestore index
→ Fix: Create index (link in error message)

### ❌ DB Not Initialized
→ Firebase config issue
→ Fix: Check environment variables

## Next Steps After Diagnosis

1. **If permission-denied:**
   - Ensure user is logged in
   - Check Firestore rules allow reads
   - Deploy updated rules

2. **If failed-precondition:**
   - Create missing indexes
   - Deploy indexes file

3. **If DB not initialized:**
   - Check `.env.local` file
   - Verify Firebase config
   - Restart dev server

4. **If all checks pass but no data:**
   - Check if collections have data in Firebase Console
   - Verify collection names match exactly
   - Check component code for data filtering issues
