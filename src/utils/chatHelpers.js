import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Helper function to get user details (name and role) from users collection
 * @param {string} userId - User UID
 * @returns {Promise<{name: string, role: string}>} - User name and role
 */
async function getUserDetails(userId) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const name = userData.displayName || userData.name || userData.email?.split('@')[0] || 'User';
      let role = 'user';
      if (userData.role === 'constructor') {
        role = 'contractor';
      } else if (userData.role === 'renovator') {
        role = 'renovator';
      } else if (userData.role) {
        role = userData.role;
      }
      return { name, role };
    }
  } catch (error) {
    console.error(`Error fetching user details for ${userId}:`, error);
  }
  // Fallback if user document doesn't exist or error occurs
  return { name: 'User', role: 'user' };
}

/**
 * Find or create a chat between two users
 * Queries for existing chats in 'chats' collection where both users are participants
 * Creates new chat if none exists
 * @param {string} currentUid - Current user's UID
 * @param {string} otherUid - Other participant's UID (provider UID)
 * @returns {Promise<string>} - Chat document ID from 'chats' collection
 */
export async function findOrCreateConversation(currentUid, otherUid) {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }

  if (!currentUid || !otherUid) {
    throw new Error('Both user IDs are required');
  }

  if (currentUid === otherUid) {
    throw new Error('Cannot create chat with yourself');
  }

  try {
    // Step 1: Query 'chats' collection where current user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUid)
    );

    const snapshot = await getDocs(chatsQuery);
    
    // Step 2: Filter to find chat with both participants
    let existingChat = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const participants = data.participants || [];
      
      // Check if both users are in the participants array
      if (participants.includes(currentUid) && participants.includes(otherUid) && participants.length === 2) {
        existingChat = {
          id: docSnap.id,
          ...data,
        };
      }
    });

    // Step 3: If chat exists, return its ID
    if (existingChat) {
      console.log('Found existing chat:', existingChat.id);
      return existingChat.id;
    }

    // Step 4: If no chat exists, fetch participant details and create a new one
    console.log('No existing chat found, creating new one');
    const participants = [currentUid, otherUid].sort();
    
    // Fetch participant details
    const [currentUserDetails, otherUserDetails] = await Promise.all([
      getUserDetails(currentUid),
      getUserDetails(otherUid),
    ]);

    // Create participantDetails object
    const participantDetails = {
      [currentUid]: {
        name: currentUserDetails.name,
        role: currentUserDetails.role,
      },
      [otherUid]: {
        name: otherUserDetails.name,
        role: otherUserDetails.role,
      },
    };

    // FIXED: Log before Firestore write
    console.log('🔵 [Chat Creation] Preparing to create chat:', {
      currentUid: currentUid,
      otherUid: otherUid,
      targetPath: 'chats',
      participantDetails: participantDetails,
    });

    const chatData = {
      participants: participants,
      participantDetails: participantDetails, // FIXED: Store participant details with name and role
      lastMessage: '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      unreadFor: {
        [currentUid]: false,
        [otherUid]: false,
      },
    };

    console.log('🔵 [Chat Creation] Payload:', {
      ...chatData,
      updatedAt: '[serverTimestamp]',
      createdAt: '[serverTimestamp]',
    });

    const newChatRef = await addDoc(collection(db, 'chats'), chatData);

    console.log('✅ [Chat Creation] Chat created successfully:', newChatRef.id);
    return newChatRef.id;
  } catch (error) {
    console.error('Error finding or creating chat:', error);
    throw error;
  }
}

/**
 * Get or create a chat between two users
 * Uses deterministic chatId: sorted UIDs joined by '_'
 * @param {string} currentUid - Current user's UID
 * @param {string} otherUid - Other participant's UID
 * @returns {Promise<string>} - Chat document ID
 * @deprecated Use findOrCreateConversation instead for proper conversation lookup
 */
export async function getOrCreateChat(currentUid, otherUid) {
  // Use the new conversation-based approach
  return findOrCreateConversation(currentUid, otherUid);
}

/**
 * Get the other participant's UID from a chat
 * @param {string} chatId - Chat document ID
 * @param {string} currentUid - Current user's UID
 * @returns {Promise<string|null>} - Other participant's UID or null
 */
export async function getOtherParticipant(chatId, currentUid) {
  if (!db || !chatId || !currentUid) {
    return null;
  }

  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      return null;
    }

    const participants = chatSnap.data().participants || [];
    return participants.find((uid) => uid !== currentUid) || null;
  } catch (error) {
    console.error('Error getting other participant:', error);
    return null;
  }
}


