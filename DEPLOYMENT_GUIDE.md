# Aptify - Deployment Guide

## Complete Test Checklist

See `TEST_CHECKLIST.md` for the full detailed checklist.

## Quick Test Summary

### 1. Page Loading Validation ✅
Test all routes load without errors:
- Public pages (Home, Properties, About, Contact)
- Authentication pages (Login, Register)
- Protected pages (My Account, Post Property, Dashboards)
- Admin pages (Admin Panel with all tabs)

### 2. Request Flows Testing ✅
- **Property Flow**: Create → Edit → Delete
- **Rental Flow**: Request → Owner Accept/Reject
- **Buy/Sell Flow**: Offer → Owner Accept/Reject
- **Construction Flow**: Request → Provider Accept/Reject → Status Updates
- **Renovation Flow**: Request → Provider Accept/Reject → Status Updates

### 3. Notifications Testing ✅
- All triggers create notifications
- Notification bell shows unread count
- Notifications page displays correctly
- Mark as read/delete works
- Admin broadcast works

### 4. Chat Testing ✅
- User can send messages in `/chatbot`
- Admin sees messages in Admin Panel
- Admin can reply
- Real-time updates work
- Notifications sent correctly

### 5. Admin Panel Testing ✅
- All 8 tabs load and function
- User management works
- Provider approval/rejection works
- Property management works
- Request management works
- Support messages/replies work
- Support chats work
- Notification sender works

## Build & Deploy Commands

### Step 1: Install Dependencies (if needed)
```bash
npm install
cd functions
npm install
cd ..
```

### Step 2: Verify Environment Variables
```bash
# Ensure .env.local exists with VITE_FIREBASE_* variables
cat .env.local

# Variables should include:
# VITE_FIREBASE_API_KEY
# VITE_FIREBASE_AUTH_DOMAIN
# VITE_FIREBASE_PROJECT_ID
# VITE_FIREBASE_STORAGE_BUCKET
# VITE_FIREBASE_MESSAGING_SENDER_ID
# VITE_FIREBASE_APP_ID
```

### Step 3: Build the Application
```bash
npm run build
```

This will:
- Compile React app with Vite
- Output to `dist/` directory
- Optimize assets for production
- Inject environment variables at build time

**Expected Output:**
```
✓ built in Xs
dist/index.html
dist/assets/index-XXXXX.js
dist/assets/index-XXXXX.css
```

### Step 4: Deploy to Firebase

#### Recommended: Deploy All Services
```bash
firebase deploy --only hosting,firestore:rules,storage:rules,functions
```

This deploys:
- **Hosting:** Web application
- **Firestore Rules:** Database security rules
- **Storage Rules:** File storage security rules
- **Functions:** Cloud Functions for automation

#### Alternative: Deploy Individual Services
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only
firebase deploy --only functions

# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy storage rules only
firebase deploy --only storage:rules

# Deploy multiple services
firebase deploy --only hosting,functions,firestore:rules
```

### Step 4: Verify Deployment

1. **Check Hosting:**
   - Visit your Firebase Hosting URL
   - Verify site loads correctly
   - Test all major features

2. **Check Functions:**
   ```bash
   firebase functions:log
   ```
   - Look for function execution logs
   - Verify no errors

3. **Check Firestore:**
   - Open Firebase Console
   - Verify data structure
   - Test security rules

## Pre-Deployment Checklist

- [ ] All tests pass (see TEST_CHECKLIST.md)
- [ ] No console errors in browser
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables configured
- [ ] Firebase project selected (`firebase use <project-id>`)
- [ ] Functions dependencies installed (`cd functions && npm install`)
- [ ] Build succeeds without errors
- [ ] All routes tested manually

## Post-Deployment Verification

### Immediate Checks
- [ ] Production site loads
- [ ] Authentication works
- [ ] Database connections work
- [ ] File uploads work
- [ ] Real-time features work

### Function Testing
- [ ] Create a property → Check admin notification
- [ ] Create rental request → Check owner notification
- [ ] Create construction request → Check provider notification
- [ ] Update project status → Check client notification
- [ ] Send support message → Check admin notification
- [ ] Send chat message → Check recipient notification

### Performance Checks
- [ ] Page load times acceptable (< 3s)
- [ ] Images load correctly
- [ ] No memory leaks in real-time listeners
- [ ] Functions execute within timeout limits

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Function Deployment Errors
```bash
# Check function logs
firebase functions:log

# Redeploy specific function
firebase deploy --only functions:onPropertyCreated
```

### Hosting Errors
```bash
# Check hosting status
firebase hosting:channel:list

# View hosting logs
firebase hosting:channel:open
```

## Environment Configuration

### Required Environment Variables
- Firebase API keys (in `src/firebase.js`)
- Firebase project ID
- Firebase app configuration

### Firebase Project Setup
1. Create/select Firebase project
2. Enable Firestore Database
3. Enable Storage
4. Enable Functions
5. Enable Hosting
6. Configure authentication providers

## Security Checklist

- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed and tested
- [ ] Functions have proper error handling
- [ ] Admin routes protected
- [ ] User data access restricted
- [ ] API keys not exposed in client code

## Monitoring

### Firebase Console
- Functions → Logs
- Firestore → Usage
- Storage → Usage
- Hosting → Analytics

### Application Monitoring
- Error tracking
- Performance monitoring
- User analytics

## Rollback Plan

If deployment fails:
```bash
# Rollback hosting
firebase hosting:rollback

# Disable problematic function
firebase functions:delete <function-name>
```

## Support

For issues:
1. Check Firebase Console logs
2. Check browser console
3. Review TEST_CHECKLIST.md
4. Check function logs: `firebase functions:log`

---

**Last Updated:** [Current Date]
**Version:** 1.0.0

