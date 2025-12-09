/**
 * Test Firestore Connection
 * Run this in browser console to diagnose Firestore issues
 */

import { db, auth } from '../firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export const testFirestoreConnection = async () => {
  console.group('🔍 Firestore Connection Test');
  
  // Test 1: Check if db is initialized
  console.log('Test 1: Firestore DB Initialization');
  if (!db) {
    console.error('❌ FAIL: Firestore db is NOT initialized');
    console.error('   → Check Firebase configuration');
    console.error('   → Check environment variables (.env.local)');
    console.error('   → Restart dev server after adding .env file');
    console.groupEnd();
    return { success: false, error: 'Firestore not initialized' };
  }
  console.log('✅ PASS: Firestore db is initialized');
  
  // Test 2: Check authentication
  console.log('\nTest 2: Authentication Status');
  if (!auth) {
    console.error('❌ FAIL: Firebase Auth is NOT initialized');
    console.groupEnd();
    return { success: false, error: 'Auth not initialized' };
  }
  console.log('✅ PASS: Firebase Auth is initialized');
  console.log('   Current User:', auth.currentUser?.email || 'Not logged in');
  
  // Test 3: Test public collection (properties)
  console.log('\nTest 3: Public Collection Query (Properties)');
  try {
    const propertiesQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'published'),
      limit(1)
    );
    const propertiesSnapshot = await getDocs(propertiesQuery);
    console.log(`✅ PASS: Successfully queried properties collection`);
    console.log(`   Found ${propertiesSnapshot.docs.length} published property(ies)`);
    
    if (propertiesSnapshot.docs.length > 0) {
      const sample = propertiesSnapshot.docs[0].data();
      console.log('   Sample property:', {
        id: propertiesSnapshot.docs[0].id,
        title: sample.title,
        status: sample.status,
        type: sample.type,
      });
    } else {
      console.warn('   ⚠️ No published properties found');
      console.warn('   → Check if properties exist in Firestore');
      console.warn('   → Check if properties have status: "published"');
    }
  } catch (error) {
    console.error('❌ FAIL: Properties query failed');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('   → Firestore rules are blocking access');
      console.error('   → Check firestore.rules file');
      console.error('   → Properties collection should allow: allow read: if true;');
    } else if (error.code === 'failed-precondition') {
      console.error('   → Firestore index is required');
      console.error('   → Check browser console for index creation link');
    }
    console.groupEnd();
    return { success: false, error: error.message, code: error.code };
  }
  
  // Test 4: Test authenticated collection (if user is logged in)
  if (auth.currentUser) {
    console.log('\nTest 4: Authenticated Collection Query (Notifications)');
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        limit(1)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      console.log(`✅ PASS: Successfully queried notifications collection`);
      console.log(`   Found ${notificationsSnapshot.docs.length} notification(s)`);
    } catch (error) {
      console.error('❌ FAIL: Notifications query failed');
      console.error('   Error Code:', error.code);
      console.error('   Error Message:', error.message);
      
      if (error.code === 'permission-denied') {
        console.error('   → User might not have permission');
        console.error('   → Check Firestore rules for notifications');
      }
    }
  } else {
    console.log('\nTest 4: Authenticated Collection Query (Notifications)');
    console.log('   ⚠️ SKIP: User not logged in (authentication required)');
  }
  
  console.log('\n✅ All tests completed');
  console.groupEnd();
  return { success: true };
};

// Auto-run in development
if (import.meta.env.DEV) {
  // Run after a short delay to ensure Firebase is initialized
  setTimeout(() => {
    testFirestoreConnection().catch(console.error);
  }, 2000);
}

