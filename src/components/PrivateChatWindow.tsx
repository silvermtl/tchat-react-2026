import { useState, useEffect, useRef } from 'react';
import { DraggableBox } from './DraggableBox';
import type { User } from '../types';
import { useChat, type PrivateMessage } from '../context/ChatContext';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { GifPicker } from './GifPicker';

interface PrivateChatWindowProps {
  user: User;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

export function PrivateChatWindow({ user, onClose, initialPosition }: PrivateChatWindowProps) {
  const {
    currentUser,
    sendPrivateMessage,
    getPrivateMessages,
    privateTypingUsers,
    isConnected
  } = useChat();
  const { playPrivateMessageSound } = useNotificationSound();

  const [inputValue, setInputValue] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);

  // Get messages for this conversation
  const messages = getPrivateMessages(user.id);
  const isTyping = privateTypingUsers.has(user.id);

  // Play sound when receiving new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      // Only play sound for messages from the other user
      if (lastMessage && lastMessage.fromUserId !== currentUser?.id) {
        playPrivateMessageSound();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, currentUser?.id, playPrivateMessageSound]);

  // Auto-scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages needed to trigger scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!inputValue.trim() || !currentUser) return;

    sendPrivateMessage(user.id, inputValue.trim(), 'text');
    setInputValue('');
  };

  const handleGifSelect = (gifUrl: string) => {
    sendPrivateMessage(user.id, gifUrl, 'gif');
    setShowGifPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isFromMe = (msg: PrivateMessage) => {
    return msg.fromUserId === currentUser?.id;
  };

  const renderMessageContent = (msg: PrivateMessage) => {
    if (msg.type === 'gif' || msg.type === 'image') {
      return (
        <div className="private-media">
          <img
            src={msg.content}
            alt="Media"
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              borderRadius: 8,
              cursor: 'pointer'
            }}
            onClick={() => window.open(msg.content, '_blank')}
          />
        </div>
      );
    }
    return msg.content;
  };

  return (
    <DraggableBox
      title={`Privé - ${user.username}`}
      onClose={onClose}
      initialPosition={initialPosition}
      width={340}
    >
      <div className="private-chat-container">
        {/* Connection status */}
        {!isConnected && (
          <div className="private-offline-banner">
            Mode hors ligne - Messages locaux uniquement
          </div>
        )}

        {/* Messages area */}
        <div className="private-messages">
          {messages.length === 0 ? (
            <div className="private-empty">
              <div className="private-empty-icon">💬</div>
              <span>Commencez la conversation avec <strong>{user.username}</strong></span>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`private-message ${isFromMe(msg) ? 'me' : 'them'}`}
                >
                  {!isFromMe(msg) && (
                    <div className="private-message-avatar">
                      {msg.fromAvatar ? (
                        <img src={msg.fromAvatar} alt={msg.fromUsername} />
                      ) : (
                        <span>{msg.fromUsername.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  <div className="private-message-content">
                    <div className="private-bubble">
                      {renderMessageContent(msg)}
                    </div>
                    <div className="private-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="private-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-text">{user.username} écrit...</span>
            </div>
          )}
        </div>

        {/* GIF Picker */}
        {showGifPicker && (
          <div className="private-gif-picker">
            <GifPicker onGifSelect={(url) => { handleGifSelect(url); setShowGifPicker(false); }} />
          </div>
        )}

        {/* Input area */}
        <div className="private-input-area">
          <button
            type="button"
            className="private-media-btn"
            onClick={() => setShowGifPicker(!showGifPicker)}
            title="Envoyer un GIF"
          >
            GIF
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Votre message..."
            className="private-input"
          />
          <button
            type="button"
            className="private-send"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </DraggableBox>
  );
}
