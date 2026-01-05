/**
 * Set admin custom claim for a given UID.
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/setAdminClaim.js <uid>
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/setAdminClaim.js <uid>');
    process.exit(1);
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Admin claim set for UID: ${uid}`);
    console.log('ℹ️ User must sign out and sign in again for the claim to take effect.');
  } catch (err) {
    console.error('❌ Failed to set admin claim:', err);
    process.exit(1);
  }
}

main();








