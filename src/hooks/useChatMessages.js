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
import { db } from '../firebase';
import { uploadImage } from '../firebase/storageFunctions';
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
  // FIXED: Added auth check and proper error handling for blocked collections
  useEffect(() => {
    if (!chatId || !db || !currentUser || !currentUser.uid) {
      setLoading(false);
      setMessages([]);
      return;
    }

    setLoading(true);

    try {
      // FIXED: chats collection is blocked by Firestore rules
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
          // Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.error('Permission denied accessing messages:', error);
            setMessages([]);
            setLoading(false);
            return;
          }
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
                if (fallbackError.code === 'permission-denied') {
                  console.warn('Chats collection is blocked by Firestore rules');
                }
                setMessages([]);
                setLoading(false);
              }
            );

            // Store fallback unsubscribe for cleanup
            return () => {
              if (unsubscribe) unsubscribe();
              if (fallbackUnsubscribe) fallbackUnsubscribe();
            };
          } else {
            setMessages([]);
            setLoading(false);
          }
        }
      );

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setMessages([]);
      setLoading(false);
    }
  }, [chatId, currentUser, db]);

  // Send message function
  // FIXED: Added auth check and proper error handling for blocked collections
  const sendMessage = useCallback(
    async (text, attachments = []) => {
      if (!chatId || !currentUser || !currentUser.uid || !db || !text.trim()) {
        throw new Error('Missing required parameters or user not authenticated');
      }

      setSending(true);

      try {
        // FIXED: chats collection is blocked by Firestore rules
        // Upload attachments if any
        const attachmentUrls = [];
        if (attachments && attachments.length > 0) {
          for (const file of attachments) {
            try {
              // Upload to Cloudinary using storageFunctions
              const folder = `user_uploads/${currentUser.uid}/chats/${chatId}`;
              const url = await uploadImage(file, folder);
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

        // Step 1: Get chat document and verify currentUser is a participant
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          throw new Error('Chat not found');
        }

        const chatData = chatSnap.data();
        const participants = chatData?.participants || [];
        
        // Verify currentUser.uid is in participants array
        if (!participants.includes(currentUser.uid)) {
          throw new Error('You are not a participant in this chat');
        }

        const receiverId = participants.find((uid) => uid !== currentUser.uid);

        // Step 2: Get sender role and name from user document
        let senderRole = 'user';
        let senderName = currentUser.displayName || currentUser.email || 'User';
        
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Get sender name
            senderName = userData.name || userData.displayName || userData.email || senderName;
            // Get sender role
            if (userData.role === 'constructor') {
              senderRole = 'contractor';
            } else if (userData.role === 'renovator') {
              senderRole = 'renovator';
            } else if (userData.role === 'admin') {
              senderRole = 'admin';
            } else {
              senderRole = 'user';
            }
          }
        } catch (roleError) {
          console.error('Error fetching user role/name:', roleError);
          // Default to 'user' if role fetch fails
        }

        // Step 3: Create readBy object with all participants
        const readBy = {};
        participants.forEach((participantId) => {
          readBy[participantId] = participantId === currentUser.uid; // Sender has read their own message
        });

        // FIXED: Log before Firestore write
        console.log('🔵 [Chat Message] Preparing to write message:', {
          authUid: currentUser.uid,
          chatId: chatId,
          targetPath: `chats/${chatId}/messages`,
          senderName: senderName,
          senderRole: senderRole,
          messagePreview: text.trim().substring(0, 50) + '...',
        });

        // Step 4: Add message to subcollection using addDoc (CREATE only) - includes senderName
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messageData = {
          senderId: currentUser.uid,
          senderName: senderName, // FIXED: Added senderName field
          senderRole: senderRole,
          receiverId: receiverId,
          text: text.trim(),
          attachments: attachmentUrls,
          createdAt: serverTimestamp(),
          readBy: readBy,
        };
        
        console.log('🔵 [Chat Message] Payload:', {
          ...messageData,
          createdAt: '[serverTimestamp]',
          attachments: attachmentUrls.length,
        });

        await addDoc(messagesRef, messageData);
        console.log('✅ [Chat Message] Message created successfully');

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
