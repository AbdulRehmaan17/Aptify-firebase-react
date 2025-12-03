import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { getOrCreateChat } from '../utils/chatHelpers';

/**
 * Hook to fetch and send messages in a chat
 * @param {string} chatId - Chat document ID (optional, can be created on first message)
 * @param {string} otherUserId - Other user ID (required if chatId is not provided)
 * @returns {Object} - { messages, loading, sendMessage, sending, chatId: actualChatId }
 */
export function useChatMessages(chatId, otherUserId = null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actualChatId, setActualChatId] = useState(chatId);

  // Fetch messages
  useEffect(() => {
    const finalChatId = actualChatId || chatId;
    if (!finalChatId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const messagesRef = collection(db, 'chats', finalChatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const msgs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(msgs);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching messages:', error);
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(collection(db, 'chats', finalChatId, 'messages'));

            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const msgs = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                // Sort client-side
                msgs.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return aTime - bTime;
                });

                setMessages(msgs);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching messages (fallback):', fallbackError);
                setLoading(false);
              }
            );

            return () => fallbackUnsubscribe();
          } else {
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setLoading(false);
    }
  }, [actualChatId, chatId]);

  // Send message function
  const sendMessage = useCallback(
    async (text, attachments = []) => {
      if (!chatId || !user || !db || !text.trim()) {
        throw new Error('Missing required parameters');
      }

      setSending(true);

      try {
        // Upload attachments if any
        const attachmentUrls = [];
        if (attachments && attachments.length > 0) {
          for (const file of attachments) {
            try {
              const storageRef = ref(
                storage,
                `user_uploads/${user.uid}/chats/${chatId}/${Date.now()}_${file.name}`
              );
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              attachmentUrls.push({
                name: file.name,
                url: url,
                type: file.type,
                size: file.size,
              });
            } catch (uploadError) {
              console.error('Error uploading attachment:', uploadError);
              // Continue with message even if attachment fails
            }
          }
        }

        // Auto-create chat room if needed
        let finalChatId = actualChatId || chatId;
        if (!finalChatId && otherUserId) {
          // Create chat room on first message
          finalChatId = await getOrCreateChat(user.uid, otherUserId);
          setActualChatId(finalChatId);
        }
        
        if (!finalChatId) {
          throw new Error('Chat ID or other user ID is required');
        }

        // Get chat document to find receiver
        const chatRef = doc(db, 'chats', finalChatId);
        const chatSnap = await getDoc(chatRef);
        
        // Auto-create chat if it doesn't exist
        if (!chatSnap.exists()) {
          if (otherUserId) {
            // Create chat room
            await setDoc(chatRef, {
              participants: [user.uid, otherUserId].sort(),
              lastMessage: '',
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              unreadFor: {
                [user.uid]: false,
                [otherUserId]: false,
              },
            });
          } else {
            throw new Error('Chat not found and cannot create without other user ID');
          }
        }
        
        const chatData = chatSnap.exists() ? chatSnap.data() : {
          participants: [user.uid, otherUserId].sort(),
          unreadFor: {},
        };
        const participants = chatData?.participants || [];
        const receiverId = participants.find((uid) => uid !== user.uid);
        
        if (!receiverId) {
          throw new Error('Receiver not found in chat');
        }

        // Add message to subcollection with proper structure
        const messagesRef = collection(db, 'chats', finalChatId, 'messages');
        await addDoc(messagesRef, {
          chatRoomId: finalChatId,
          senderId: user.uid,
          text: text.trim(),
          attachments: attachmentUrls,
          createdAt: serverTimestamp(),
          read: false,
          seenBy: [user.uid], // Sender has seen their own message
        });

        // Update parent chat document
        const textSnippet = text.trim().substring(0, 50) + (text.trim().length > 50 ? '...' : '');
        const unreadFor = {
          ...(chatData?.unreadFor || {}),
          [receiverId]: true,
          [user.uid]: false, // Mark as read for sender
        };

        await updateDoc(chatRef, {
          lastMessage: textSnippet,
          updatedAt: serverTimestamp(),
          unreadFor: unreadFor,
        });

        // Send notification to receiver
        try {
          await notificationService.sendNotification(
            receiverId,
            'New Message',
            textSnippet,
            'info',
            `/chat?chatId=${finalChatId}`
          );
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Don't fail message send if notification fails
        }
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [actualChatId, chatId, otherUserId, user]
  );

  // Mark chat as read when messages are loaded
  useEffect(() => {
    const finalChatId = actualChatId || chatId;
    if (!finalChatId || !user || !db || messages.length === 0) return;

    const markAsRead = async () => {
      try {
        const chatRef = doc(db, 'chats', finalChatId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) return;
        
        const chatData = chatSnap.data();

        if (chatData?.unreadFor?.[user.uid] === true) {
          await updateDoc(chatRef, {
            unreadFor: {
              ...chatData.unreadFor,
              [user.uid]: false,
            },
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    };

    markAsRead();
  }, [actualChatId, chatId, user, messages.length]);

  return { messages, loading, sendMessage, sending, chatId: actualChatId || chatId };
}

