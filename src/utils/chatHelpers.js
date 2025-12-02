import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Get or create a chat between two users
 * Uses deterministic chatId: sorted UIDs joined by '_'
 * @param {string} currentUid - Current user's UID
 * @param {string} otherUid - Other participant's UID
 * @returns {Promise<string>} - Chat document ID
 */
export async function getOrCreateChat(currentUid, otherUid) {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }

  if (!currentUid || !otherUid) {
    throw new Error('Both user IDs are required');
  }

  if (currentUid === otherUid) {
    throw new Error('Cannot create chat with yourself');
  }

  // Create deterministic chatId: sort UIDs and join with '_'
  const participants = [currentUid, otherUid].sort();
  const chatId = participants.join('_');

  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      // Create new chat document
      await setDoc(chatRef, {
        participants: participants,
        lastMessage: '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadFor: {
          [currentUid]: false,
          [otherUid]: false,
        },
      });
    }

    return chatId;
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    throw error;
  }
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


