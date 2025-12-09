import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';

/**
 * Hook to fetch and send messages in a chat
 * @param {string} chatId - Chat document ID
 * @returns {Object} - { messages, loading, sendMessage, sending }
 */
export function useChatMessages(chatId) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch messages
  useEffect(() => {
    if (!chatId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
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
            const fallbackQuery = query(collection(db, 'chats', chatId, 'messages'));

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

            // Store fallback unsubscribe for cleanup
            return () => {
              unsubscribe();
              fallbackUnsubscribe();
            };
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
  }, [chatId]);

  // Send message function
  const sendMessage = useCallback(
    async (text, attachments = []) => {
      if (!chatId || !currentUser || !db || !text.trim()) {
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
                `user_uploads/${currentUser.uid}/chats/${chatId}/${Date.now()}_${file.name}`
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

        // Get chat document to find receiver
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        const chatData = chatSnap.data();
        const participants = chatData?.participants || [];
        const receiverId = participants.find((uid) => uid !== currentUser.uid);

        // Add message to subcollection
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
          senderId: currentUser.uid,
          receiverId: receiverId,
          text: text.trim(),
          attachments: attachmentUrls,
          createdAt: serverTimestamp(),
        });

        // Update parent chat document
        const unreadFor = {
          ...(chatData?.unreadFor || {}),
          [receiverId]: (chatData?.unreadFor?.[receiverId] || 0) + 1,
          [currentUser.uid]: 0, // Mark as read for sender
        };

        await updateDoc(chatRef, {
          lastMessage: text.trim().substring(0, 100),
          updatedAt: serverTimestamp(),
          unreadFor: unreadFor,
        });

        // Send notification to receiver
        if (receiverId) {
          try {
            // Get sender and receiver names for personalized notifications
            let senderName = 'Someone';
            let receiverName = 'User';
            
            try {
              const senderDoc = await getDoc(doc(db, 'users', currentUser.uid));
              if (senderDoc.exists()) {
                const senderData = senderDoc.data();
                senderName = senderData.displayName || senderData.name || senderData.email?.split('@')[0] || 'Someone';
              }
              
              const receiverDoc = await getDoc(doc(db, 'users', receiverId));
              if (receiverDoc.exists()) {
                const receiverData = receiverDoc.data();
                receiverName = receiverData.displayName || receiverData.name || receiverData.email?.split('@')[0] || 'User';
              }
            } catch (nameError) {
              console.error('Error fetching user names:', nameError);
            }

            // Check if receiver is a constructor/provider
            const serviceProvidersQuery = query(
              collection(db, 'serviceProviders'),
              where('userId', '==', receiverId),
              where('serviceType', '==', 'Construction')
            );
            const providerSnapshot = await getDocs(serviceProvidersQuery);
            const isReceiverConstructor = !providerSnapshot.empty;

            // Check if sender is a constructor/provider
            const senderProvidersQuery = query(
              collection(db, 'serviceProviders'),
              where('userId', '==', currentUser.uid),
              where('serviceType', '==', 'Construction')
            );
            const senderProviderSnapshot = await getDocs(senderProvidersQuery);
            const isSenderConstructor = !senderProviderSnapshot.empty;

            // Send appropriate notification based on roles
            if (isSenderConstructor) {
              // Provider sending to client
              await notificationService.notifyClientNewMessage(receiverId, senderName, chatId);
            } else if (isReceiverConstructor) {
              // Client sending to provider
              await notificationService.notifyProviderNewMessage(receiverId, senderName, chatId);
            } else {
              // Default notification for other cases
              await notificationService.sendNotification(
                receiverId,
                'New Chat Message',
                `${senderName}: ${text.trim().substring(0, 50)}${text.trim().length > 50 ? '...' : ''}`,
                'info',
                `/chat?chatId=${chatId}`
              );
            }
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
            // Don't fail message send if notification fails
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [chatId, currentUser]
  );

  // Mark chat as read when messages are loaded
  useEffect(() => {
    if (!chatId || !currentUser || !db || messages.length === 0) return;

    const markAsRead = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        const chatData = chatSnap.data();

        if (chatData?.unreadFor?.[currentUser.uid]) {
          await updateDoc(chatRef, {
            unreadFor: {
              ...chatData.unreadFor,
              [currentUser.uid]: 0,
            },
          });
        }
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    };

    markAsRead();
  }, [chatId, currentUser, messages.length]);

  return { messages, loading, sendMessage, sending };
}
