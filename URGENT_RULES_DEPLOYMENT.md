# 🚨 URGENT: Deploy Firestore Rules Immediately

## ⚠️ CRITICAL ISSUE

Your app is showing **"Permission denied"** errors because the Firestore security rules have NOT been deployed to Firebase yet.

The rules file (`firestore.rules`) has been updated with the correct permissions, but **Firebase is still using the old rules** until you deploy them.

## 🔥 IMMEDIATE ACTION REQUIRED

### Option 1: Firebase Console (Easiest)

1. **Open Firebase Console:**
   - Go to: https://console.firebase.google.com
   - Select your project

2. **Navigate to Firestore Rules:**
   - Click **Firestore Database** in left sidebar
   - Click **Rules** tab at the top

3. **Copy and Paste Rules:**
   - Open `firestore.rules` file from your project
   - Copy ALL contents
   - Paste into the Firebase Console rules editor
   - Click **Publish** button

4. **Wait 1-2 minutes** for rules to propagate

### Option 2: Firebase CLI

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

## ✅ Verify Rules Are Deployed

After deploying, check the rules in Firebase Console:
- Should see: `allow get: if true;` for properties
- Should see: `allow list: if true;` for properties

## 📋 Current Rules (Copy This to Firebase Console)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions for cleaner rules
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             exists(/databases/$(database)/documents/userProfiles/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Public properties (global listings)
    // FIXED: Explicitly allow both get (single doc) and list (collection queries) for public access
    match /properties/{propertyId} {
      allow get: if true;  // Allow reading individual documents
      allow list: if true; // Allow listing/querying the collection
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (isOwner(resource.data.ownerId) || isOwner(request.resource.data.ownerId));
      allow delete: if isSignedIn() && isOwner(resource.data.ownerId);
    }

    // Public rental listings
    match /rentalListings/{listingId} {
      allow get: if true;
      allow list: if true;
      allow write: if request.auth != null;
    }

    // User-specific profiles (owner only)
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Users collection — auth-bound records
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Notifications — authenticated only
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }

    // Saved properties — authenticated only
    match /savedProperties/{docId} {
      allow read, write: if request.auth != null;
    }

    // Service providers - public read
    match /serviceProviders/{providerId} {
      allow get: if true;
      allow list: if true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Construction projects
    match /constructionProjects/{projectId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.providerId);
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Renovation projects
    match /renovationProjects/{projectId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.providerId);
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Rental requests
    match /rentalRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.ownerId);
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Buy/Sell requests
    match /buySellRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.uid == resource.data.ownerId);
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Chats and messages
    match /chats/{chatId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.participants;
      allow update: if request.auth != null && request.auth.uid in resource.data.participants;
      allow delete: if request.auth != null && request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && request.auth.uid == request.resource.data.senderId;
        allow update: if request.auth != null && request.auth.uid == resource.data.senderId;
        allow delete: if request.auth != null && request.auth.uid == resource.data.senderId;
      }
    }

    // Reviews - public read
    match /reviews/{reviewId} {
      allow get: if true;
      allow list: if true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.reviewerId;
      allow update: if request.auth != null && request.auth.uid == resource.data.reviewerId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.reviewerId;
    }

    // Support messages
    match /supportMessages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
      
      match /replies/{replyId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null && request.auth.uid == resource.data.userId;
        allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
      }
    }

    // Constructors collection
    match /constructors/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      match /profile/{profileId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Renovators collection
    match /renovators/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      match /profile/{profileId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Project updates subcollection
    match /{parentCollection}/{parentId}/projectUpdates/{updateId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Block everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🧪 Test After Deployment

1. Refresh your app in the browser
2. Navigate to `/properties` page
3. Check browser console - should have NO permission errors
4. Properties should load and display

## ❓ Still Getting Errors?

If you still get permission errors after deploying:
1. Wait 2-3 minutes (rules can take time to propagate)
2. Clear browser cache and refresh
3. Check Firebase Console → Firestore → Rules to verify rules are saved
4. Check browser console for specific error codes

