import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { ChatMessage } from './ChatMessage';
import { SystemMessage } from './SystemMessage';
import { MessageInput } from './MessageInput';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { TypingIndicator } from './TypingIndicator';

export function ChatRoom() {
  const { messages, systemMessages, setMessages, setSystemMessages, currentUser, typingUsers } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const prevSystemMessagesLength = useRef(systemMessages.length);
  const { playMessageSound, playJoinSound, playLeaveSound } = useNotificationSound();

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewMessagesCount(0);
    }
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessagesCount(0);
    setIsAtBottom(true);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll and sound on new messages
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      const newCount = messages.length - prevMessagesLength.current;
      if (newCount > 0) {
        setNewMessagesCount(prev => prev + newCount);
      }
    }

    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.userId !== currentUser?.id) {
        const isMuted = localStorage.getItem('chat-sound-muted') === 'true';
        if (!isMuted) {
          playMessageSound();
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isAtBottom, currentUser?.id, playMessageSound]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: sound on system messages
  useEffect(() => {
    if (systemMessages.length > prevSystemMessagesLength.current) {
      const lastSystemMessage = systemMessages[systemMessages.length - 1];
      if (lastSystemMessage) {
        const isMuted = localStorage.getItem('chat-sound-muted') === 'true';
        if (!isMuted) {
          if (lastSystemMessage.type === 'join') {
            playJoinSound();
          } else if (lastSystemMessage.type === 'leave') {
            playLeaveSound();
          }
        }
      }
    }
    prevSystemMessagesLength.current = systemMessages.length;
  }, [systemMessages.length, playJoinSound, playLeaveSound]);

  const handleClearChat = () => {
    setMessages([]);
    setSystemMessages([]);
  };

  const allMessages = [
    ...messages.map(m => ({ ...m, _type: "message" as const })),
    ...systemMessages.map(m => ({ ...m, _type: "system" as const })),
  ].sort((a, b) => {
    const ta = Date.parse(String(a.timestamp ?? ""));
    const tb = Date.parse(String(b.timestamp ?? ""));
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    if (!Number.isFinite(ta)) return 1;
    if (!Number.isFinite(tb)) return -1;
    return ta - tb;
  });

  return (
    <section className="chat">
      {/* Chat bar */}
      <div className="chatbar">
        <div className="left">
          <div className="icon">💬</div>
          <h2>Salon Principal</h2>
        </div>
        <button type="button" className="btn" onClick={handleClearChat}>
          Effacer
        </button>
      </div>

      {/* New messages button */}
      {newMessagesCount > 0 && (
        <button type="button" className="newBtn" onClick={scrollToBottom}>
          ⬇ {newMessagesCount} nouveau{newMessagesCount > 1 ? 'x' : ''} message{newMessagesCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="messages"
      >
        {allMessages.map((item) => (
          <div key={item._type === "message" ? `msg-${item.id}` : `sys-${item.id}`}>
            {item._type === "message" ? (
              <ChatMessage message={item} />
            ) : (
              <SystemMessage message={item} />
            )}
          </div>
        ))}

        {typingUsers.length > 0 && (
          <TypingIndicator username={typingUsers.map(u => u.username).join(", ")} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <MessageInput />
    </section>
  );
}
