# Firestore Data Not Displaying - Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for errors:
- Look for `permission-denied` errors
- Look for `failed-precondition` errors (missing indexes)
- Look for `Firestore db is not initialized` errors

### 2. Run Diagnostic Tool
In browser console, run:
```javascript
// Import and run diagnostics
import { runFirestoreDiagnostics } from './src/utils/firestoreDiagnostics';
runFirestoreDiagnostics();
```

Or add this to your main component temporarily:
```javascript
import { runFirestoreDiagnostics } from './utils/firestoreDiagnostics';

// In useEffect or componentDidMount
useEffect(() => {
  runFirestoreDiagnostics();
}, []);
```

### 3. Common Issues and Fixes

#### Issue 1: User Not Authenticated
**Symptoms:**
- No data showing
- Console shows: `permission-denied` errors
- Most collections require authentication

**Fix:**
- Ensure user is logged in
- Check `AuthContext` is working
- Verify `currentUser` is set

#### Issue 2: Firestore Rules Blocking Reads
**Symptoms:**
- Console shows: `permission-denied` errors
- Some data shows, some doesn't

**Fix:**
- Check `firestore.rules` file
- Ensure rules allow reads for authenticated users
- Deploy rules: `firebase deploy --only firestore:rules`

#### Issue 3: Missing Firestore Indexes
**Symptoms:**
- Console shows: `failed-precondition` errors
- Error message mentions "index"

**Fix:**
- Check `firestore.indexes.json`
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Or click the link in the error message to create index

#### Issue 4: Database Not Initialized
**Symptoms:**
- Console shows: `Firestore db is not initialized`
- All queries fail

**Fix:**
- Check `src/firebase/config.js` - Firebase config is correct
- Check environment variables are set
- Verify Firebase project is active

#### Issue 5: Network/Connection Issues
**Symptoms:**
- Queries timeout
- No errors but no data

**Fix:**
- Check internet connection
- Check Firebase project status
- Verify Firebase project ID is correct

## Step-by-Step Debugging

### Step 1: Verify Firebase Initialization
```javascript
import { db, auth } from './firebase';

console.log('DB initialized:', !!db);
console.log('Auth initialized:', !!auth);
console.log('Current user:', auth?.currentUser?.uid);
```

### Step 2: Test Simple Query
```javascript
import { collection, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';

// Test public collection (properties)
const testQuery = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'properties'));
    console.log('Properties count:', snapshot.size);
    snapshot.forEach(doc => {
      console.log('Property:', doc.id, doc.data());
    });
  } catch (error) {
    console.error('Query error:', error.code, error.message);
  }
};

testQuery();
```

### Step 3: Check Firestore Rules
Review `firestore.rules`:
- Properties: `allow read: if true;` (public)
- Users: Requires authentication
- Other collections: Check specific rules

### Step 4: Check Authentication State
```javascript
import { useAuth } from './context/AuthContext';

// In component
const { currentUser, loading, userProfile } = useAuth();
console.log('Auth state:', { currentUser: currentUser?.uid, loading, userProfile });
```

## Quick Fixes

### Fix 1: Temporarily Allow All Reads (Development Only)
**WARNING: Only for development!**

In `firestore.rules`, temporarily add:
```javascript
match /{document=**} {
  allow read: if true; // TEMPORARY - REMOVE IN PRODUCTION
}
```

### Fix 2: Add Error Handling to Queries
```javascript
try {
  const snapshot = await getDocs(collection(db, 'properties'));
  // Process data
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('Permission denied. Check Firestore rules.');
  } else if (error.code === 'failed-precondition') {
    console.error('Missing index. Create the required index.');
  } else {
    console.error('Query error:', error);
  }
}
```

### Fix 3: Verify Collection Names
Ensure collection names match exactly:
- `properties` (not `property`)
- `users` (not `user`)
- `serviceProviders` (not `serviceProvider`)
- `constructionProjects` (not `constructionProject`)
- `renovationProjects` (not `renovationProject`)

## Next Steps

1. Run the diagnostic tool
2. Check browser console for specific errors
3. Verify authentication state
4. Check Firestore rules
5. Verify indexes are deployed
6. Test with a simple query

## Getting Help

If issues persist, provide:
1. Browser console errors (screenshot)
2. Diagnostic tool output
3. Authentication state (logged in?)
4. Which collections are failing
5. Firestore rules file content


