/**
 * Script to set admin custom claims for Firebase Auth users
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key
 * 3. Run: node scripts/set-admin-claims.js <user-email>
 * 
 * Or use Firebase Console:
 * - Go to Authentication → Users
 * - Select user → Custom Claims → Add claim: admin = true
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
// For local development, set GOOGLE_APPLICATION_CREDENTIALS environment variable
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    console.error('Please set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    process.exit(1);
  }
}

/**
 * Set admin custom claim for a user
 * @param {string} userEmail - User email address
 */
async function setAdminClaim(userEmail) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(userEmail);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✅ Admin claim set for user: ${userEmail} (UID: ${user.uid})`);
    console.log('⚠️  User must sign out and sign in again for changes to take effect');
    
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error(`❌ Error setting admin claim for ${userEmail}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove admin custom claim from a user
 * @param {string} userEmail - User email address
 */
async function removeAdminClaim(userEmail) {
  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    console.log(`✅ Admin claim removed for user: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error removing admin claim:`, error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  const userEmail = process.argv[2];
  const action = process.argv[3] || 'set';
  
  if (!userEmail) {
    console.error('Usage: node set-admin-claims.js <user-email> [set|remove]');
    process.exit(1);
  }
  
  if (action === 'remove') {
    removeAdminClaim(userEmail).then(() => process.exit(0));
  } else {
    setAdminClaim(userEmail).then(() => process.exit(0));
  }
}

module.exports = { setAdminClaim, removeAdminClaim };
