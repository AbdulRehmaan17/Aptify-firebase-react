import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIXED: Check auth and handle blocked collection gracefully
    if (!user || !user.uid || !db || !auth?.currentUser) {
      setLoading(false);
      setConversations([]);
      return;
    }

    try {
      // Query chats collection where current user is a participant
      const conversationsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          const convos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setConversations(convos);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching chats:', error);
          // Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.warn('Chats collection access denied');
            setConversations([]);
            setLoading(false);
            return;
          }
          // Fallback without orderBy for index errors
          if (error.code === 'failed-precondition') {
            const fallbackQuery = query(
              collection(db, 'chats'),
              where('participants', 'array-contains', user.uid)
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const convos = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                convos.sort((a, b) => {
                  const aTime = a.updatedAt?.toDate?.() || new Date(0);
                  const bTime = b.updatedAt?.toDate?.() || new Date(0);
                  return bTime - aTime;
                });
                setConversations(convos);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error fetching chats (fallback):', fallbackError);
                if (fallbackError.code === 'permission-denied') {
                  console.warn('Chats collection access denied');
                }
                setConversations([]);
                setLoading(false);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setConversations([]);
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up chats listener:', error);
      setConversations([]);
      setLoading(false);
    }
  }, [user, db, auth]);

  useEffect(() => {
    // FIXED: Check auth and handle blocked collection
    if (!selectedConversation || !db || !auth?.currentUser) {
      setMessages([]);
      return;
    }

    try {
      const messagesQuery = query(
        collection(db, 'chats', selectedConversation.id, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const msgs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(msgs);
        },
        (error) => {
          console.error('Error fetching messages:', error);
          // FIXED: Handle permission denied gracefully
          if (error.code === 'permission-denied') {
            console.warn('Messages collection is blocked by Firestore rules');
            setMessages([]);
            return;
          }
          // Fallback without orderBy
          if (error.code === 'failed-precondition') {
            const fallbackQuery = query(
              collection(db, 'chats', selectedConversation.id, 'messages')
            );
            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
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
              },
              (fallbackError) => {
                console.error('Error fetching messages (fallback):', fallbackError);
                setMessages([]);
              }
            );
            return () => fallbackUnsubscribe();
          } else {
            setMessages([]);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setMessages([]);
    }
  }, [selectedConversation, db, auth]);

  const sendMessage = async (e) => {
    e.preventDefault();
    // Check auth and required fields
    if (!newMessage.trim() || !selectedConversation || !user || !user.uid || !db || !auth?.currentUser) {
      return;
    }

    try {
      // Step 1: Verify user is a participant in the chat
      const chatRef = doc(db, 'chats', selectedConversation.id);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        alert('Chat not found');
        return;
      }

      const chatData = chatDoc.data();
      const participants = chatData.participants || [];
      
      // Verify user.uid is in participants array
      if (!participants.includes(user.uid)) {
        alert('You are not a participant in this chat');
        return;
      }

      // Step 2: Get sender role and name from user document
      let senderRole = 'user';
      let senderName = user.displayName || user.email || 'User';
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
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
        readBy[participantId] = participantId === user.uid; // Sender has read their own message
      });

      // FIXED: Log before Firestore write
      console.log('🔵 [Chat Message] Preparing to write message:', {
        authUid: user.uid,
        chatId: selectedConversation.id,
        targetPath: `chats/${selectedConversation.id}/messages`,
        senderName: senderName,
        senderRole: senderRole,
        messagePreview: newMessage.substring(0, 50) + '...',
      });

      // Step 4: Create message using addDoc (CREATE only) - includes senderName
      const messageData = {
        senderId: user.uid,
        senderName: senderName, // FIXED: Added senderName field
        senderRole: senderRole,
        text: newMessage,
        createdAt: serverTimestamp(),
        readBy: readBy,
      };
      
      console.log('🔵 [Chat Message] Payload:', {
        ...messageData,
        createdAt: '[serverTimestamp]',
      });

      await addDoc(collection(db, 'chats', selectedConversation.id, 'messages'), messageData);
      console.log('✅ [Chat Message] Message created successfully');

      // Step 3: Update chat document with lastMessage and updatedAt
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle errors
      if (error.code === 'permission-denied') {
        console.error('Permission denied sending message:', error);
        alert('Failed to send message. Please check your permissions.');
      } else {
        console.error('Error sending message:', error);
        alert(error.message || 'Failed to send message. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-textMain mb-8">Messages</h1>

        <div className="bg-surface rounded-base shadow-sm border border-muted overflow-hidden">
          <div className="flex h-[600px]">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-muted overflow-y-auto bg-muted/30">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-textSecondary">
                  <p className="mb-2">No chats yet</p>
                  <p className="text-xs text-muted">
                    Start a conversation by messaging a service provider.
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left border-b border-muted hover:bg-muted transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <p className="font-semibold text-textMain">Conversation</p>
                    <p className="text-sm text-textSecondary">
                      {conversation.participants?.length || 0} participants
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col bg-surface">
              {selectedConversation ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-muted text-textMain rounded-bl-none'
                            }`}
                          >
                            {/* FIXED: Sender label - use senderName if available, fallback to userNames or role */}
                            <div className="flex items-center gap-2 mb-1">
                              {isOwn ? (
                                <p className="text-xs font-semibold opacity-90">You</p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold opacity-75">
                                    {message.senderName || 
                                     userNames[message.senderId] || 
                                     (message.senderRole === 'contractor' ? 'Contractor' :
                                      message.senderRole === 'renovator' ? 'Renovator' :
                                      message.senderRole === 'admin' ? 'Admin' : 'User')}
                                  </p>
                                  {message.senderRole && message.senderRole !== 'user' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                                      {message.senderRole === 'contractor' ? 'Contractor' :
                                       message.senderRole === 'renovator' ? 'Renovator' :
                                       message.senderRole === 'admin' ? 'Admin' : message.senderRole}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Message text */}
                            <p className={`text-sm whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-textMain'}`}>
                              {message.text}
                            </p>
                            
                            {/* Timestamp */}
                            <div className="flex items-center justify-end mt-1">
                              <span className={`text-xs ${isOwn ? 'opacity-80' : 'opacity-60'}`}>
                                {message.createdAt?.toDate?.()?.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                }) || 'Just now'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={sendMessage} className="border-t border-muted p-4 bg-surface">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded-base hover:bg-primaryDark transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-textSecondary">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
