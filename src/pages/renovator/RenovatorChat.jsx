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
import { db } from '../../firebase';
import toast from 'react-hot-toast';

/**
 * RenovatorChat Component
 * Full chat functionality for renovation service providers
 * Allows renovators to message customers for renovation requests
 * Auto-creates chat rooms and shows conversation list with real-time updates
 */
const RenovatorChat = () => {
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
      navigate('/auth');
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

        // Load other participant name from participantDetails (preferred) or fallback
        if (otherId) {
          if (chatData.participantDetails && chatData.participantDetails[otherId]) {
            // Use participantDetails if available
            const otherDetails = chatData.participantDetails[otherId];
            setOtherParticipantName(otherDetails.name || 'Customer');
            // Role is usually 'user' for customers, so we can show "Customer" in header
          } else {
            // Fallback for old chats without participantDetails
            try {
              const userDoc = await getDoc(doc(db, 'users', otherId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setOtherParticipantName(
                  userData.displayName ||
                  userData.name ||
                  userData.email?.split('@')[0] ||
                  'Customer'
                );
              } else {
                setOtherParticipantName('Customer');
              }
            } catch (error) {
              console.error('Error loading customer name:', error);
              setOtherParticipantName('Customer');
            }
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
    navigate(`/renovator/chat?chatId=${chatId}`);
    await loadChatInfo(chatId);
    setViewMode('chat');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
                  navigate('/renovator/chat');
                } else {
                  navigate('/renovator/dashboard');
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
                      <p className="text-xs text-textSecondary">Customer</p>
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
                  <p className="text-sm text-textSecondary mt-2">
                    Your conversations with customers will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenovatorChat;



