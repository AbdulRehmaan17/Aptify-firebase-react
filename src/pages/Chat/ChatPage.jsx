import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateChat } from '../../utils/chatHelpers';
import ConversationList from '../../components/Chat/ConversationList';
import MessageBox from '../../components/Chat/MessageBox';
import { ArrowLeft, User } from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedChatId, setSelectedChatId] = useState(searchParams.get('chatId') || null);
  const [otherParticipantId, setOtherParticipantId] = useState(null);
  const [otherParticipantName, setOtherParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'chat'

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId) {
      setSelectedChatId(chatId);
      loadChatInfo(chatId);
    }
  }, [searchParams]);

  const loadChatInfo = async (chatId) => {
    if (!chatId || !currentUser || !db) return;

    try {
      setLoading(true);
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherId = chatData.participants.find((id) => id !== currentUser.uid);
        setOtherParticipantId(otherId);

        // Load other participant name
        if (otherId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setOtherParticipantName(
                userData.displayName ||
                userData.name ||
                userData.email?.split('@')[0] ||
                'Unknown User'
              );
            }
          } catch (error) {
            console.error('Error loading user name:', error);
            setOtherParticipantName('Unknown User');
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat info:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (chatId) => {
    setSelectedChatId(chatId);
    navigate(`/chat?chatId=${chatId}`);
    await loadChatInfo(chatId);
    setViewMode('chat');
  };

  const handleStartNewChat = async (userId) => {
    if (!currentUser || !userId) return;

    try {
      setLoading(true);
      const chatId = await getOrCreateChat(currentUser.uid, userId);
      setSelectedChatId(chatId);
      navigate(`/chat?chatId=${chatId}`);
      await loadChatInfo(chatId);
      setViewMode('chat');
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-surface border-b border-muted px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (viewMode === 'chat') {
                  setViewMode('list');
                  setSelectedChatId(null);
                  navigate('/chat');
                } else {
                  navigate(-1);
                }
              }}
              className="md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-display font-bold text-textMain">Messages</h1>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List - Hidden on mobile when chat is open */}
          <div
            className={`${
              viewMode === 'list' || !selectedChatId ? 'flex' : 'hidden'
            } md:flex w-full md:w-80 flex-shrink-0`}
          >
            <ConversationList
              onSelectConversation={handleSelectConversation}
              selectedChatId={selectedChatId}
            />
          </div>

          {/* Message Box - Hidden on mobile when list is shown */}
          <div
            className={`${
              viewMode === 'chat' || selectedChatId ? 'flex' : 'hidden'
            } md:flex flex-1 flex-col`}
          >
            {selectedChatId && otherParticipantId ? (
              <>
                {/* Chat Header */}
                <div className="bg-surface border-b border-muted px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-textMain">{otherParticipantName}</p>
                      <p className="text-xs text-textSecondary">Online</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <MessageBox chatId={selectedChatId} otherParticipantId={otherParticipantId} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-surface">
                <div className="text-center">
                  <p className="text-textSecondary">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;



