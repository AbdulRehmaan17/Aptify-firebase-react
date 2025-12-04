/**
 * Migration script to migrate rental properties from alternate collection names
 * to the standardized 'properties' collection with type='rent'
 * 
 * Usage:
 *   node scripts/migrate_rentals_collection.js
 * 
 * This script:
 * 1. Reads from alternate collection names (rentalProperties, rental_properties, etc.)
 * 2. Writes each doc to 'properties' collection with normalized fields
 * 3. Adds 'migratedAt' timestamp
 * 4. Prints summary counts
 * 
 * NOTE: This script should be run manually and reviewed before execution.
 * It does NOT automatically execute - it's a template that requires Firebase admin setup.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../path-to-your-service-account-key.json'); // UPDATE THIS PATH

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Collection names to check (add more if needed)
const SOURCE_COLLECTIONS = [
  'rentalProperties',
  'rental_properties',
  'rentals',
];

const TARGET_COLLECTION = 'properties';

/**
 * Normalize rental property document
 */
function normalizeRentalDoc(docData, docId) {
  return {
    ...docData,
    type: 'rent',
    listingType: 'rent',
    status: docData.status || 'available',
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    migratedFrom: docData.migratedFrom || 'unknown',
    // Ensure required fields exist
    ownerId: docData.ownerId || docData.owner || null,
    createdAt: docData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Migrate documents from source collection to target collection
 */
async function migrateCollection(sourceCollection, targetCollection) {
  console.log(`\n📦 Migrating from '${sourceCollection}' to '${targetCollection}'...`);
  
  try {
    const snapshot = await db.collection(sourceCollection).get();
    
    if (snapshot.empty) {
      console.log(`   ✓ No documents found in '${sourceCollection}'`);
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`   Found ${snapshot.size} documents`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (const doc of snapshot.docs) {
      try {
        const docData = doc.data();
        const docId = doc.id;
        
        // Check if already migrated
        if (docData.migratedAt) {
          console.log(`   ⏭️  Skipping ${docId} (already migrated)`);
          skipped++;
          continue;
        }
        
        // Normalize document
        const normalized = normalizeRentalDoc(docData, docId);
        normalized.migratedFrom = sourceCollection;
        
        // Add to batch
        const targetRef = db.collection(targetCollection).doc(docId);
        batch.set(targetRef, normalized, { merge: true });
        batchCount++;
        
        // Execute batch if at limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✓ Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
        
        migrated++;
      } catch (error) {
        console.error(`   ✗ Error migrating document ${doc.id}:`, error.message);
        errors++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✓ Committed final batch of ${batchCount} documents`);
    }
    
    console.log(`   ✓ Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    
    return { migrated, skipped, errors };
  } catch (error) {
    console.error(`   ✗ Error migrating collection '${sourceCollection}':`, error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting rental properties migration...\n');
  console.log('⚠️  WARNING: This script will modify your Firestore database.');
  console.log('   Make sure you have a backup before proceeding.\n');
  
  const totals = {
    migrated: 0,
    skipped: 0,
    errors: 0,
  };
  
  // Migrate from each source collection
  for (const sourceCollection of SOURCE_COLLECTIONS) {
    const result = await migrateCollection(sourceCollection, TARGET_COLLECTION);
    totals.migrated += result.migrated;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Total Migrated: ${totals.migrated}`);
  console.log(`   Total Skipped:  ${totals.skipped}`);
  console.log(`   Total Errors:   ${totals.errors}`);
  console.log('='.repeat(50));
  console.log('\n✅ Migration complete!\n');
}

// Run migration
if (require.main === module) {
  main()
    .then(() => {
      console.log('Migration script finished successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCollection, normalizeRentalDoc };

