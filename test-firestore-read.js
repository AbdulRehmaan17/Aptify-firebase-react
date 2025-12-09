// Test script to verify Firestore read access
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCmlbNCJGx5rwMv4D26-hGvlfdmAKJQm-0',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'aptify-82cd6.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'aptify-82cd6',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'aptify-82cd6.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '375881241889',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:375881241889:web:57c58411c47750ba039a60',
};

console.log('Testing Firestore connection...');
console.log('Project ID:', firebaseConfig.projectId);

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log('Testing read access to properties collection...');
  
  const propertiesRef = collection(db, 'properties');
  const snapshot = await getDocs(propertiesRef);
  
  console.log(`✅ Successfully read ${snapshot.docs.length} documents from properties collection`);
  console.log('✅ Firestore read access is working correctly!');
  
  if (snapshot.docs.length > 0) {
    console.log('Sample document:', snapshot.docs[0].id);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Error code:', error.code);
  process.exit(1);
}

