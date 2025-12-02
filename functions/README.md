# Firebase Cloud Functions for Aptify

This directory contains Firebase Cloud Functions that automate notifications and other backend processes.

## Functions Overview

### 1. Property Management
- **onPropertyCreated**: When a new property is created
  - Notifies all admins about the new property
  - Confirms to the property owner that their listing was submitted

### 2. Construction Projects
- **onConstructionProjectCreated**: When a new construction project is created
  - Confirms to the client that their request was submitted
  - Notifies the assigned provider (or all approved construction providers if none assigned)

- **onConstructionProjectUpdated**: When a construction project status changes
  - Notifies both the client and provider about the status update

### 3. Renovation Projects
- **onRenovationProjectCreated**: When a new renovation project is created
  - Confirms to the client that their request was submitted
  - Notifies the assigned provider (or all approved renovation providers if none assigned)

- **onRenovationProjectUpdated**: When a renovation project status changes
  - Notifies both the client and provider about the status update

### 4. Reviews
- **onReviewCreated**: When a new review is created
  - Notifies the provider about the new review (for construction/renovation services)

### 5. Support
- **onSupportMessageCreated**: When a new support message is created
  - Notifies all admins about the new support message

- **onSupportChatMessageCreated**: When a new message is added to a support chat
  - Notifies the recipient (admin if user sent, user if admin sent)

### 6. User Chats
- **onChatMessageCreated**: When a new message is added to a user chat
  - Notifies the receiver about the new message

## Setup

1. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

2. **Verify Firebase CLI is installed:**
   ```bash
   firebase --version
   ```
   If not installed:
   ```bash
   npm install -g firebase-tools
   ```

3. **Login to Firebase:**
   ```bash
   firebase login
   ```

4. **Set your Firebase project:**
   ```bash
   firebase use <your-project-id>
   ```

## Deployment

### Deploy all functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

### Deploy a specific function:
```bash
firebase deploy --only functions:onPropertyCreated
```

### View function logs:
```bash
firebase functions:log
```

### View logs for a specific function:
```bash
firebase functions:log --only onPropertyCreated
```

## Local Development

### Run functions emulator:
```bash
cd functions
npm run serve
```

This will start the Firebase emulator suite. Functions will be available at:
- `http://localhost:5001/<project-id>/<region>/<function-name>`

### Test functions locally:
1. Start the emulator: `npm run serve`
2. Use the Firebase console or your app to trigger events
3. Check emulator logs for function execution

## Testing

After deployment, test the functions by:

1. **Test Property Creation:**
   - Create a new property from the frontend
   - Verify admin receives notification
   - Verify property owner receives confirmation

2. **Test Construction/Renovation Projects:**
   - Create a new construction/renovation request
   - Verify client receives confirmation
   - Verify provider receives notification
   - Update project status
   - Verify both client and provider receive status update notifications

3. **Test Reviews:**
   - Submit a review for a construction/renovation provider
   - Verify provider receives notification

4. **Test Support Messages:**
   - Submit a support message
   - Verify all admins receive notification

5. **Test Support Chats:**
   - Send a message in support chat
   - Verify recipient receives notification

6. **Test User Chats:**
   - Send a message in a user chat
   - Verify receiver receives notification

## Monitoring

- View function execution logs in Firebase Console: https://console.firebase.google.com/project/<project-id>/functions/logs
- Monitor function performance and errors
- Set up alerts for function failures

## Troubleshooting

### Functions not triggering:
1. Check Firebase Console for function deployment status
2. Verify Firestore rules allow the operations
3. Check function logs for errors
4. Ensure the document structure matches what the function expects

### Notification not created:
1. Check function logs for errors
2. Verify user IDs exist in the `users` collection
3. Check that the notification collection is accessible

### Provider notifications not working:
1. Verify `serviceProviders` collection has correct structure
2. Check that `userId` field exists in provider documents
3. Verify provider documents have `isApproved: true` for broadcast notifications

## Dependencies

- `firebase-admin`: ^12.0.0 - Admin SDK for server-side operations
- `firebase-functions`: ^4.5.0 - Firebase Cloud Functions runtime

## Node Version

Functions run on Node.js 18 (as specified in package.json engines field).
