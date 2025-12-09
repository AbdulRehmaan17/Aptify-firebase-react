/**
 * Script to set admin custom claim for the current logged-in user
 * 
 * This script requires:
 * 1. Firebase Admin SDK installed: npm install firebase-admin
 * 2. Service account key file (JSON)
 * 3. GOOGLE_APPLICATION_CREDENTIALS environment variable set
 * 
 * Usage:
 *   node scripts/set-current-user-admin.js <user-email>
 * 
 * Or set via Firebase Console:
 *   Authentication → Users → Select user → Custom Claims → Add claim: admin = true
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.error('⚠️  Please set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.error('   Example: $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"');
    process.exit(1);
  }
}

/**
 * Set admin custom claim for a user by email
 * @param {string} userEmail - User email address
 */
async function setAdminClaim(userEmail) {
  try {
    console.log(`\n🔍 Looking up user: ${userEmail}...`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(userEmail);
    console.log(`✅ Found user: ${user.email} (UID: ${user.uid})`);
    
    // Set custom claim
    console.log('🔧 Setting admin custom claim...');
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`\n✅ Admin claim set successfully for: ${userEmail}`);
    console.log(`   UID: ${user.uid}`);
    console.log('\n⚠️  IMPORTANT: User must sign out and sign in again for changes to take effect');
    console.log('   The ID token needs to be refreshed to include the new custom claim');
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    const customClaims = updatedUser.customClaims || {};
    console.log(`\n📋 Custom claims:`, customClaims);
    
    if (customClaims.admin === true) {
      console.log('✅ Verification: Admin claim is set correctly');
    } else {
      console.log('⚠️  Warning: Admin claim may not be set correctly');
    }
    
    return { success: true, uid: user.uid, email: user.email };
  } catch (error) {
    console.error(`\n❌ Error setting admin claim for ${userEmail}:`, error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('   User not found. Please check the email address.');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   Invalid email format.');
    } else {
      console.error('   Error details:', error);
    }
    
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  const userEmail = process.argv[2];
  
  if (!userEmail) {
    console.error('\n❌ Usage: node set-current-user-admin.js <user-email>');
    console.error('\nExample:');
    console.error('  node scripts/set-current-user-admin.js user@example.com');
    process.exit(1);
  }
  
  setAdminClaim(userEmail)
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Operation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Operation failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { setAdminClaim };

