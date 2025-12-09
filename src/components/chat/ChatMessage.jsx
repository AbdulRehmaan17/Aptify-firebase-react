import React from 'react';
import { File } from 'lucide-react';

/**
 * ChatMessage Component
 * Displays a single message bubble with text, attachments, and timestamp
 */
const ChatMessage = ({ message, isOwn, senderName }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderAttachment = (attachment, index) => {
    if (attachment.type?.startsWith('image/')) {
      return (
        <div key={index} className="mt-2 rounded-lg overflow-hidden">
          <img
            src={attachment.url}
            alt={attachment.name || 'Attachment'}
            className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
          />
        </div>
      );
    } else {
      return (
        <a
          key={index}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-base hover:bg-accent/50 transition-colors"
        >
          <File className="w-4 h-4" />
          <span className="text-sm truncate">{attachment.name || 'Download'}</span>
        </a>
      );
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && senderName && (
          <span className="text-xs text-textSecondary mb-1 px-2">{senderName}</span>
        )}
        <div
          className={`rounded-lg p-3 ${
            isOwn ? 'bg-primary text-white max-w-xs' : 'bg-muted text-textMain max-w-xs'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>

          {/* Render attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
            </div>
          )}

          <span className={`text-xs mt-1 block ${isOwn ? 'text-white/80' : 'text-textSecondary'}`}>
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
