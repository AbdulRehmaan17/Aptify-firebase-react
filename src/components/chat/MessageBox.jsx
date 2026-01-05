import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
// NOTE: updateDoc is only used for chat documents, NOT for messages
// Messages can only be created (addDoc), never updated per Firestore security rules
import { db, auth } from '../../firebase';
import notificationService from '../../services/notificationService';
import { Send, Paperclip, Smile } from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const MessageBox = ({ chatId, otherParticipantId }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userNames, setUserNames] = useState({});
  const [seenStatus, setSeenStatus] = useState({});
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatId && currentUser) {
      loadMessages();
      markAsRead();
    }
  }, [chatId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = () => {
    // FIXED: Check auth and handle blocked collection
    if (!db || !chatId || !currentUser || !currentUser.uid || !auth?.currentUser) {
      setLoading(false);
      setMessages([]);
      return;
    }

    setLoading(true);
    let unsubscribe = null;
    let fallbackUnsubscribe = null;

    try {
      // FIXED: chats collection is blocked by Firestore rules
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      );

      unsubscribe = onSnapshot(
        messagesQuery,
        async (snapshot) => {
          const messagesList = [];
          const userIds = new Set();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            messagesList.push({
              id: docSnap.id,
              ...data,
            });
            if (data.senderId) {
              userIds.add(data.senderId);
            }
          });

          // Load user names
          await loadUserNames(Array.from(userIds));

          // Load seen status
          await loadSeenStatus(messagesList);

          setMessages(messagesList);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading messages:', error);
          // Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.error('Permission denied accessing messages:', error);
            setMessages([]);
            setLoading(false);
            return;
          }
          // Fallback without orderBy
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            const fallbackQuery = query(
              collection(db, 'chats', chatId, 'messages'),
              limit(100)
            );
            fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              async (fallbackSnapshot) => {
                const messagesList = [];
                const userIds = new Set();

                fallbackSnapshot.forEach((docSnap) => {
                  const data = docSnap.data();
                  messagesList.push({
                    id: docSnap.id,
                    ...data,
                  });
                  if (data.senderId) {
                    userIds.add(data.senderId);
                  }
                });

                await loadUserNames(Array.from(userIds));
                await loadSeenStatus(messagesList);

                // Sort client-side
                messagesList.sort((a, b) => {
                  const aTime = a.createdAt?.toDate?.() || new Date(0);
                  const bTime = b.createdAt?.toDate?.() || new Date(0);
                  return aTime - bTime;
                });

                setMessages(messagesList);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error loading messages (fallback):', fallbackError);
                if (fallbackError.code === 'permission-denied') {
                  console.error('Permission denied accessing messages:', fallbackError);
                } else {
                  toast.error('Failed to load messages');
                }
                setMessages([]);
                setLoading(false);
              }
            );
          } else {
            setMessages([]);
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setMessages([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (fallbackUnsubscribe) fallbackUnsubscribe();
    };
  };

  const loadUserNames = async (userIds) => {
    const newNames = { ...userNames };
    const promises = userIds.map(async (userId) => {
      if (newNames[userId]) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          newNames[userId] =
            userData.displayName ||
            userData.name ||
            userData.email?.split('@')[0] ||
            'Unknown User';
        } else {
          newNames[userId] = 'Unknown User';
        }
      } catch (error) {
        console.error(`Error loading user ${userId}:`, error);
        newNames[userId] = 'Unknown User';
      }
    });
    await Promise.all(promises);
    setUserNames(newNames);
  };

  const loadSeenStatus = async (messagesList) => {
    // Update to use readBy object instead of seenBy array
    const status = {};
    for (const message of messagesList) {
      if (message.readBy && typeof message.readBy === 'object') {
        // Check if other participant has read the message
        status[message.id] = message.readBy[otherParticipantId] === true;
      } else {
        // Fallback for old messages with seenBy array
        if (message.seenBy && Array.isArray(message.seenBy)) {
          status[message.id] = message.seenBy.includes(otherParticipantId);
        } else {
          status[message.id] = false;
        }
      }
    }
    setSeenStatus(status);
  };

  const markAsRead = async () => {
    if (!chatId || !currentUser || !db) return;

    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const unreadFor = chatData.unreadFor || {};
        if (unreadFor[currentUser.uid] === true) {
          await updateDoc(doc(db, 'chats', chatId), {
            unreadFor: {
              ...unreadFor,
              [currentUser.uid]: false,
            },
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    // Check auth and required fields
    if (!newMessage.trim() || !chatId || !currentUser || !currentUser.uid || !db || !auth?.currentUser || sending) {
      return;
    }

    setSending(true);
    try {
      // Step 1: Verify currentUser is a participant in the chat
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        throw new Error('Chat not found');
      }

      const chatData = chatDoc.data();
      const participants = chatData.participants || [];
      
      // Verify currentUser.uid is in participants array
      if (!participants.includes(currentUser.uid)) {
        throw new Error('You are not a participant in this chat');
      }

      // Step 2: Get sender role from user document
      let senderRole = 'user';
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'constructor') {
            senderRole = 'contractor';
          } else if (userData.role === 'renovator') {
            senderRole = 'renovator';
          } else {
            senderRole = 'user';
          }
        }
      } catch (roleError) {
        console.error('Error fetching user role:', roleError);
        // Default to 'user' if role fetch fails
      }

      // Step 3: Create readBy object with all participants
      const readBy = {};
      participants.forEach((participantId) => {
        readBy[participantId] = participantId === currentUser.uid; // Sender has read their own message
      });

      // Step 4: Create message in subcollection with complete structure
      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        senderRole: senderRole,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        readBy: readBy,
      });

      // Step 5: Update chat document with lastMessage and updatedAt
      const unreadFor = chatData.unreadFor || {};
      const otherParticipant = participants.find((uid) => uid !== currentUser.uid);
      
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
        unreadFor: {
          ...unreadFor,
          [otherParticipant]: true,
          [currentUser.uid]: false,
        },
      });

      // Step 6: Send notification to other participant
      if (otherParticipant) {
        try {
          await notificationService.create(
            otherParticipant,
            'New Message',
            `${userNames[currentUser.uid] || 'Someone'} sent you a message`,
            'info',
            `/chat?chatId=${chatId}`
          );
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Don't fail the message send if notification fails
        }
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle permission denied
      if (error.code === 'permission-denied') {
        toast.error('Failed to send message. Please check your permissions.');
      } else {
        toast.error(error.message || 'Failed to send message. Please try again.');
      }
    } finally {
      // FIXED: Always reset sending state
      setSending(false);
    }
  };

  // NOTE: markMessageAsSeen is disabled because Firestore rules only allow CREATE for messages
  // Messages cannot be updated after creation. Seen status should be tracked client-side or in chat document
  const markMessageAsSeen = async (messageId) => {
    // Disabled: Cannot update messages per Firestore security rules
    // Messages are immutable - only CREATE permission is allowed
    // Seen status tracking should be handled differently (e.g., in chat document or client-side)
    return;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now - 86400000).toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-center">
          <p className="text-textSecondary">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-textSecondary">No messages yet</p>
              <p className="text-sm text-textSecondary mt-2">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUser.uid;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showDate =
              !prevMessage ||
              formatDate(prevMessage.createdAt) !== formatDate(message.createdAt);
            const isSeen = seenStatus[message.id] || false;

            // Mark as seen if it's from other participant
            if (!isOwn && !isSeen && message.senderId === otherParticipantId) {
              markMessageAsSeen(message.id);
            }

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-4">
                    <span className="text-xs text-textSecondary bg-muted px-3 py-1 rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-muted text-textMain rounded-bl-none'
                    }`}
                  >
                    {/* Sender label */}
                    <div className="flex items-center gap-2 mb-1">
                      {isOwn ? (
                        <p className="text-xs font-semibold opacity-90">You</p>
                      ) : (
                        <p className="text-xs font-semibold opacity-75">
                          {message.senderRole === 'contractor' 
                            ? 'Contractor' 
                            : message.senderRole === 'renovator'
                            ? 'Renovator'
                            : userNames[message.senderId] || 'User'}
                        </p>
                      )}
                    </div>
                    
                    {/* Message text */}
                    <p className={`text-sm whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-textMain'}`}>
                      {message.text}
                    </p>
                    
                    {/* Timestamp and read status */}
                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className={`text-xs ${isOwn ? 'opacity-80' : 'opacity-60'}`}>
                        {formatTime(message.createdAt)}
                      </span>
                      {isOwn && message.readBy && (
                        <span className="text-xs">
                          {message.readBy[otherParticipantId] ? (
                            <span className="opacity-90" title="Read">
                              ✓✓
                            </span>
                          ) : (
                            <span className="opacity-60" title="Sent">
                              ✓
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-muted p-4 bg-surface">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary focus:outline-none"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            loading={sending}
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MessageBox;

