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
import { db } from '../../firebase/firebase';
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
    if (!db || !chatId) return;

    setLoading(true);

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
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
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            limit(100)
          );
          const fallbackUnsubscribe = onSnapshot(
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
              toast.error('Failed to load messages');
              setLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          toast.error('Failed to load messages');
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
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
    const status = {};
    for (const message of messagesList) {
      if (message.seenBy && Array.isArray(message.seenBy)) {
        status[message.id] = message.seenBy.includes(otherParticipantId);
      } else {
        status[message.id] = false;
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
        const unreadCounts = chatData.unreadCounts || {};
        if (unreadCounts[currentUser.uid] > 0) {
          await updateDoc(doc(db, 'chats', chatId), {
            [`unreadCounts.${currentUser.uid}`]: 0,
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

    if (!newMessage.trim() || !chatId || !currentUser || sending) return;

    setSending(true);
    try {
      // Add message to subcollection
      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        seenBy: [currentUser.uid], // Sender has seen their own message
      });

      // Update chat document
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCounts.${otherParticipantId}`]: (await getDoc(chatRef)).data()?.unreadCounts?.[otherParticipantId] || 0 + 1,
        updatedAt: serverTimestamp(),
      });

      // Send notification to other participant
      try {
        await notificationService.create(
          otherParticipantId,
          'New Message',
          `${userNames[currentUser.uid] || 'Someone'} sent you a message`,
          'info',
          `/chat?chatId=${chatId}`
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the message send if notification fails
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const markMessageAsSeen = async (messageId) => {
    if (!messageId || !otherParticipantId || !db) return;

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        const seenBy = messageData.seenBy || [];

        if (!seenBy.includes(otherParticipantId)) {
          await updateDoc(messageRef, {
            seenBy: [...seenBy, otherParticipantId],
          });
        }
      }
    } catch (error) {
      console.error('Error marking message as seen:', error);
    }
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
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-muted text-textMain rounded-bl-none'
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {userNames[message.senderId] || 'Unknown User'}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className="text-xs opacity-75">
                        {formatTime(message.createdAt)}
                      </span>
                      {isOwn && (
                        <span className="text-xs">
                          {isSeen ? (
                            <span className="text-blue-300" title="Seen">
                              ✓✓
                            </span>
                          ) : (
                            <span className="opacity-75" title="Sent">
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

