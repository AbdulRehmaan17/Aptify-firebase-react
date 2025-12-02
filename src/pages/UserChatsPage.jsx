import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Paperclip, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useChatList from '../hooks/useChatList';
import { useChatMessages } from '../hooks/useChatMessages';
import ChatMessage from '../components/chat/ChatMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

/**
 * UserChatsPage Component
 * Two-column layout: left = chat list, right = messages
 */
const UserChatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { chats, loading: chatsLoading } = useChatList();
  const [selectedChatId, setSelectedChatId] = useState(searchParams.get('chatId') || null);
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { messages, loading: messagesLoading, sendMessage, sending } = useChatMessages(selectedChatId);

  // Update URL when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      setSearchParams({ chatId: selectedChatId });
    } else {
      setSearchParams({});
    }
  }, [selectedChatId, setSearchParams]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle chat selection
  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    // Check file sizes (max 10MB each)
    const oversizedFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && selectedFiles.length === 0) {
      return;
    }

    if (!selectedChatId) {
      toast.error('Please select a chat');
      return;
    }

    try {
      await sendMessage(messageText || 'Sent an attachment', selectedFiles);
      setMessageText('');
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  // Filter chats by search term
  const filteredChats = chats.filter((chat) =>
    chat.otherParticipantName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to access chats</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Chat List */}
      <div className="w-full md:w-80 lg:w-96 bg-surface border-r border-muted flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-muted">
          <h2 className="text-xl font-bold text-textMain mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-textSecondary">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted" />
              <p>{searchTerm ? 'No chats found' : 'No chats yet'}</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Try a different search term' : 'Start a conversation to see chats here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-muted">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`w-full p-4 text-left hover:bg-background transition-colors ${
                    selectedChatId === chat.id ? 'bg-background border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-textMain truncate">
                        {chat.otherParticipantName}
                      </h3>
                      <p className="text-sm text-textSecondary truncate mt-1">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="md" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-textSecondary">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  {messages.map((message) => {
                    const isOwn = message.senderId === user.uid;
                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        senderName={!isOwn ? chats.find((c) => c.id === selectedChatId)?.otherParticipantName : null}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-surface border-t border-muted">
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted rounded-base px-3 py-2 text-sm"
                    >
                      <Paperclip className="w-4 h-4 text-textSecondary" />
                      <span className="text-textMain truncate max-w-xs">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-textSecondary hover:text-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-textSecondary hover:text-textMain transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={2}
                  className="flex-1 px-4 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary resize-none"
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <Button type="submit" loading={sending} disabled={sending || (!messageText.trim() && selectedFiles.length === 0)}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center text-textSecondary">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted" />
              <p className="text-lg font-medium">Select a chat to start messaging</p>
              <p className="text-sm mt-2">Choose a conversation from the list on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserChatsPage;

