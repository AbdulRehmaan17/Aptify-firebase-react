import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import notificationService from '../services/notificationService';

const Chatbot = () => {
  const { user, currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatId = user?.uid || currentUser?.uid;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize or get chat document
  useEffect(() => {
    if (!chatId || !db) {
      setLoading(false);
      return;
    }

    const initializeChat = async () => {
      try {
        const chatRef = doc(db, 'supportChats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          // Create chat document if it doesn't exist
          await setDoc(chatRef, {
            userId: chatId,
            adminId: null,
            status: 'active',
            unreadForUser: false,
            unreadForAdmin: true,
            lastMessage: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, [chatId]);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId || !db) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'supportChats', chatId, 'messages');
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
          const fallbackUnsubscribe = onSnapshot(
            messagesRef,
            (snapshot) => {
              const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              msgs.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(0);
                const bTime = b.createdAt?.toDate?.() || new Date(0);
                return aTime - bTime;
              });
              setMessages(msgs);
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
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !db || !user) {
      toast.error('Please log in to send messages');
      return;
    }

    try {
      setSending(true);
      const messagesRef = collection(db, 'supportChats', chatId, 'messages');

      // Add message
      await addDoc(messagesRef, {
        sender: 'user',
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
      });

      // Update chat document
      const chatRef = doc(db, 'supportChats', chatId);
      await updateDoc(chatRef, {
        unreadForUser: false,
        unreadForAdmin: true,
        lastMessage: newMessage.trim().substring(0, 100),
        updatedAt: serverTimestamp(),
      });

      // Notify all admins
      try {
        const adminsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'admin')
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        const adminPromises = adminsSnapshot.docs.map((adminDoc) =>
          notificationService.sendNotification(
            adminDoc.id,
            'New Support Chat Message',
            `You have a new message from a user: "${newMessage.trim().substring(0, 50)}${newMessage.trim().length > 50 ? '...' : ''}"`,
            'admin',
            '/admin'
          )
        );
        await Promise.all(adminPromises);
      } catch (notifError) {
        console.error('Error notifying admins:', notifError);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (!user && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-textMain mb-2">Please Log In</h2>
          <p className="text-textSecondary mb-4">You need to be logged in to use the support chat.</p>
          <Button onClick={() => navigate('/auth')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-surface rounded-base shadow-sm border border-muted mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-textSecondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-textMain flex items-center">
                  <MessageCircle className="w-6 h-6 mr-2 text-primary" />
                  Support Chat
                </h1>
                <p className="text-sm text-textSecondary">Chat with our support team</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="bg-surface rounded-base shadow-sm border border-muted flex flex-col h-[600px]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="md" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-textSecondary">No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.sender === 'user';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col max-w-[70%]">
                      <div
                        className={`rounded-base p-3 ${
                          isUser
                            ? 'bg-primary text-white'
                            : 'bg-muted text-textMain'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <p
                        className={`text-xs mt-1 px-1 ${
                          isUser ? 'text-right text-textSecondary' : 'text-left text-textSecondary'
                        }`}
                      >
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-muted p-4">
            <form onSubmit={sendMessage} className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                rows={2}
                className="flex-1 px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary resize-none bg-surface"
                placeholder="Type your message..."
                disabled={sending}
              />
              <Button
                type="submit"
                loading={sending}
                disabled={sending || !newMessage.trim()}
                className="bg-primary hover:bg-primaryDark"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

