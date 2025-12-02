import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { MessageSquare, User, Check, CheckCheck } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const ConversationList = ({ onSelectConversation, selectedChatId }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState({});

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    loadConversations();
  }, [currentUser]);

  const loadConversations = () => {
    if (!db || !currentUser) return;

    setLoading(true);

    // Query conversations where current user is a participant
    const conversationsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      async (snapshot) => {
        const convos = [];
        const userIds = new Set();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const otherParticipantId = data.participants.find((id) => id !== currentUser.uid);
          if (otherParticipantId) {
            userIds.add(otherParticipantId);
          }
          convos.push({
            id: docSnap.id,
            ...data,
            otherParticipantId,
          });
        });

        // Load user names
        await loadUserNames(Array.from(userIds));

        // Sort by updatedAt
        convos.sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.() || new Date(0);
          const bTime = b.updatedAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });

        setConversations(convos);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading conversations:', error);
        // Fallback without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
          );
          const fallbackUnsubscribe = onSnapshot(
            fallbackQuery,
            async (fallbackSnapshot) => {
              const convos = [];
              const userIds = new Set();

              fallbackSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const otherParticipantId = data.participants.find((id) => id !== currentUser.uid);
                if (otherParticipantId) {
                  userIds.add(otherParticipantId);
                }
                convos.push({
                  id: docSnap.id,
                  ...data,
                  otherParticipantId,
                });
              });

              await loadUserNames(Array.from(userIds));

              convos.sort((a, b) => {
                const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
                const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
                return bTime - aTime;
              });

              setConversations(convos);
              setLoading(false);
            },
            (fallbackError) => {
              console.error('Error loading conversations (fallback):', fallbackError);
              toast.error('Failed to load conversations');
              setLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          toast.error('Failed to load conversations');
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUnreadCount = (conversation) => {
    if (!conversation.unreadFor || conversation.unreadFor[currentUser.uid] !== true) {
      return 0;
    }
    return 1; // Boolean flag, so either 1 (unread) or 0 (read)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface border-r border-muted">
      <div className="p-4 border-b border-muted">
        <h2 className="text-xl font-display font-bold text-textMain">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-16 h-16 text-textSecondary mb-4" />
            <p className="text-textSecondary">No conversations yet</p>
            <p className="text-sm text-textSecondary mt-2">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-muted">
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation);
              const isSelected = selectedChatId === conversation.id;
              const otherUserName = userNames[conversation.otherParticipantId] || 'Loading...';

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full p-4 text-left hover:bg-background transition-colors ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-textMain truncate">{otherUserName}</p>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-textSecondary flex-shrink-0 ml-2">
                            {formatTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-textSecondary truncate">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="ml-2 flex-shrink-0 bg-primary text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;

