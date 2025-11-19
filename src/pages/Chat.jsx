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
} from 'firebase/firestore';
import { db } from '../firebase';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Fetch user's conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
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
        console.error('Error fetching conversations:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedConversation || !db) return;

    const messagesQuery = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user || !db) return;

    try {
      await addDoc(collection(db, 'conversations', selectedConversation.id, 'messages'), {
        senderId: user.uid,
        text: newMessage,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex h-[600px]">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations yet</div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="font-semibold">Conversation</p>
                    <p className="text-sm text-gray-500">
                      {conversation.participants?.length || 0} participants
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user?.uid
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p>{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMessage} className="border-t border-gray-200 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
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
