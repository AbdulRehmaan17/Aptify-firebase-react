# Aptify - Deployment Guide

Complete guide for setting up environment variables and deploying the Aptify web application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Firebase Project Configuration](#firebase-project-configuration)
4. [Build Process](#build-process)
5. [Deployment](#deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase account with project created
- [ ] Git repository (if using version control)

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login to Firebase

```bash
firebase login
```

---

## Environment Setup

### 1. Create `.env.local` File

Create a `.env.local` file in the project root directory:

```bash
# Copy from env.example
cp env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local` with your Firebase project credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Click on Web app (</>) icon
6. Copy the configuration values

### 4. Verify Environment Variables

The app reads these variables in `src/firebase.js` or `src/firebase/config.js`. Ensure they're being used correctly.

**Important:** 
- `.env.local` is in `.gitignore` (never commit credentials)
- Use different credentials for development and production
- Never expose API keys in client-side code comments

---

## Firebase Project Configuration

### 1. Enable Required Services

In Firebase Console, enable:

- [ ] **Authentication**
  - Enable Email/Password provider
  - Enable Google provider
  - Configure authorized domains

- [ ] **Firestore Database**
  - Create database in production mode
  - Set up security rules (see `firestore.rules`)
  - Create indexes (see `firestore.indexes.json`)

- [ ] **Storage**
  - Enable Cloud Storage
  - Set up security rules (see `storage.rules`)

- [ ] **Functions**
  - Enable Cloud Functions
  - Ensure billing is enabled (required for Functions)

- [ ] **Hosting**
  - Enable Firebase Hosting

### 2. Set Firestore Rules

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Or manually copy rules from `firestore.rules` to Firebase Console.

### 3. Create Firestore Indexes

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

Or manually create indexes in Firebase Console based on `firestore.indexes.json`.

### 4. Set Storage Rules

Deploy Storage rules:

```bash
firebase deploy --only storage
```

Or manually copy rules from `storage.rules` to Firebase Console.

### 5. Set Firebase Project

```bash
firebase use <your-project-id>
```

Or initialize:

```bash
firebase init
```

---

## Build Process

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install functions dependencies
cd functions
npm install
cd ..
```

### 2. Verify Environment Variables

```bash
# Check .env.local exists
cat .env.local

# Verify variables are set (don't run in production)
# The build process will use these automatically
```

### 3. Build the Application

```bash
npm run build
```

**Expected Output:**
```
✓ built in Xs
dist/index.html
dist/assets/index-XXXXX.js
dist/assets/index-XXXXX.css
dist/assets/...
```

**What happens:**
- Vite compiles React app
- Optimizes assets (minification, tree-shaking)
- Outputs to `dist/` directory
- Environment variables are injected at build time

### 4. Verify Build Output

```bash
# Check dist folder exists
ls dist/

# Verify index.html exists
ls dist/index.html

# Verify assets folder exists
ls dist/assets/
```

### 5. Test Build Locally (Optional)

```bash
# Serve built files locally
npm run preview

# Or use a simple HTTP server
cd dist
python -m http.server 8000
# Visit http://localhost:8000
```

---

## Deployment

### Option 1: Deploy Everything (Recommended for First Deployment)

```bash
firebase deploy --only hosting,firestore:rules,storage:rules,functions
```

This deploys:
- Hosting (web app)
- Firestore security rules
- Storage security rules
- Cloud Functions

### Option 2: Deploy Individual Services

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
firebase deploy --only hosting,functions
```

### Option 3: Deploy with Specific Targets

```bash
# Deploy to specific hosting site
firebase deploy --only hosting:production

# Deploy specific function
firebase deploy --only functions:onPropertyCreated
```

### Deployment Process

1. **Firebase CLI checks:**
   - Project is set
   - User is authenticated
   - Required services are enabled

2. **Build verification:**
   - Ensures `dist/` folder exists
   - Validates build output

3. **Upload:**
   - Uploads files to Firebase Hosting
   - Deploys functions to Cloud Functions
   - Updates Firestore/Storage rules

4. **Activation:**
   - Functions become active
   - Hosting site goes live
   - Rules take effect

**Expected Output:**
```
✔  Deploy complete!

Hosting URL: https://your-project-id.web.app
Functions URL: https://your-region-your-project-id.cloudfunctions.net
```

---

## Post-Deployment Verification

### 1. Verify Hosting

- [ ] Visit hosting URL
- [ ] Verify site loads correctly
- [ ] Check browser console for errors
- [ ] Test authentication
- [ ] Test main features

### 2. Verify Functions

```bash
# View function logs
firebase functions:log

# Check specific function
firebase functions:log --only onPropertyCreated
```

- [ ] Functions appear in Firebase Console
- [ ] No errors in function logs
- [ ] Functions trigger correctly (test by creating a property)

### 3. Verify Firestore Rules

- [ ] Test unauthorized access (should fail)
- [ ] Test authorized access (should succeed)
- [ ] Check Firebase Console → Firestore → Rules

### 4. Verify Storage Rules

- [ ] Test file upload (should succeed for authenticated users)
- [ ] Test unauthorized upload (should fail)
- [ ] Check Firebase Console → Storage → Rules

### 5. Test Critical Features

- [ ] User authentication works
- [ ] Property creation works
- [ ] File uploads work
- [ ] Real-time features work
- [ ] Notifications work
- [ ] Chat works

### 6. Performance Check

- [ ] Page load time < 3 seconds
- [ ] Images load correctly
- [ ] No console errors
- [ ] No network errors

---

## Troubleshooting

### Build Errors

#### Error: "Cannot find module"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Error: "VITE_FIREBASE_* is not defined"
```bash
# Solution: Check .env.local file exists and has correct variables
cat .env.local

# Ensure variables start with VITE_
# Restart dev server if running
```

#### Error: "Build failed"
```bash
# Solution: Check for syntax errors
npm run lint

# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

**If build error occurs, copy the first error text and paste it back for immediate fix prompt.**

### Deployment Errors

#### Error: "Functions deployment failed"
```bash
# Solution: Check functions code
cd functions
npm run lint

# Check function logs
firebase functions:log

# Redeploy specific function
firebase deploy --only functions:functionName
```

#### Error: "Hosting deployment failed"
```bash
# Solution: Verify dist folder exists
ls dist/

# Rebuild if needed
npm run build

# Check firebase.json configuration
cat firebase.json
```

#### Error: "Permission denied"
```bash
# Solution: Re-authenticate
firebase logout
firebase login

# Verify project access
firebase projects:list
```

### Runtime Errors

#### Error: "Firebase not initialized"
- Check environment variables are set
- Verify Firebase config in `src/firebase.js`
- Check browser console for specific error

#### Error: "Permission denied" in Firestore
- Verify Firestore rules are deployed
- Check user authentication status
- Verify user has required role/permissions

#### Error: "Storage upload failed"
- Verify Storage rules are deployed
- Check file size limits
- Verify user is authenticated

### Function Errors

#### Functions not triggering
1. Check function is deployed:
   ```bash
   firebase functions:list
   ```

2. Check function logs:
   ```bash
   firebase functions:log
   ```

3. Verify trigger path matches Firestore structure

4. Check function code for errors

#### Notification not created
1. Check function executed (logs)
2. Verify user ID exists in `users` collection
3. Check notification collection permissions
4. Verify function has proper error handling

### Common Issues

#### Issue: Environment variables not working
**Solution:**
- Ensure `.env.local` exists (not `.env`)
- Variables must start with `VITE_`
- Restart dev server after changing `.env.local`
- Rebuild after changing `.env.local`

#### Issue: Functions timeout
**Solution:**
- Check function execution time
- Optimize database queries
- Increase function timeout in `functions/index.js`:
  ```javascript
  exports.functionName = functions
    .runWith({ timeoutSeconds: 60 })
    .firestore...
  ```

#### Issue: CORS errors
**Solution:**
- Verify Firebase project settings
- Check authorized domains in Firebase Console
- Ensure API keys are correct

---

## Environment-Specific Configuration

### Development

```env
# .env.local (development)
VITE_FIREBASE_API_KEY=dev-api-key
VITE_FIREBASE_PROJECT_ID=dev-project-id
...
```

### Production

```env
# .env.production (if using)
VITE_FIREBASE_API_KEY=prod-api-key
VITE_FIREBASE_PROJECT_ID=prod-project-id
...
```

**Note:** For production, you may want to use Firebase Hosting environment variables or build-time injection.

---

## Continuous Deployment (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

---

## Rollback Plan

### Rollback Hosting

```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Disable Function

```bash
# Delete function
firebase functions:delete functionName

# Or update function to return early
```

### Revert Rules

```bash
# Redeploy previous rules
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

---

## Monitoring

### Firebase Console

- **Hosting:** Analytics, usage, performance
- **Functions:** Logs, execution time, errors
- **Firestore:** Usage, reads/writes
- **Storage:** Usage, uploads/downloads

### Application Monitoring

- Set up error tracking (e.g., Sentry)
- Monitor function execution
- Track user analytics
- Monitor performance metrics

---

## Security Checklist

Before production deployment:

- [ ] Environment variables not committed to git
- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed and tested
- [ ] Functions have proper error handling
- [ ] Admin routes protected
- [ ] User data access restricted
- [ ] API keys not exposed in client code
- [ ] HTTPS enforced
- [ ] CORS configured correctly

---

## Support

For deployment issues:

1. Check Firebase Console for errors
2. Review function logs: `firebase functions:log`
3. Check browser console for client errors
4. Review this documentation
5. Check Firebase status: https://status.firebase.google.com/

---

**Last Updated:** [Current Date]  
**Version:** 1.0.0

