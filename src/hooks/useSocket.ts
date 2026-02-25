import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

// URL du serveur Socket.IO - à modifier selon votre configuration
const SOCKET_URL = 'https://vps-702866ec.vps.ovh.ca:3000';

export interface SocketEvents {
  // Événements reçus du serveur
  onMessage: (data: MessageData) => void;
  onUserJoin: (data: UserJoinData) => void;
  onUserLeave: (data: UserLeaveData) => void;
  onTyping: (data: TypingData) => void;
  onStopTyping: (data: TypingData) => void;
  onUserKicked: (data: KickBanData) => void;
  onUserBanned: (data: KickBanData) => void;
  onUsersUpdate: (data: UsersUpdateData) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: string) => void;
}

export interface MessageData {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  avatar?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  color?: string;
  imageUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface UserJoinData {
  user: {
    id: string;
    username: string;
    avatar?: string;
    avatarUrl?: string;
    color?: string;
    role?: string;
    ipAddress?: string;
  };
  timestamp: string;
}

export interface UserLeaveData {
  userId: string;
  username: string;
  timestamp: string;
}

export interface TypingData {
  userId: string;
  username: string;
}

export interface KickBanData {
  userId: string;
  username: string;
  by: string;
  reason?: string;
  timestamp: string;
}

export interface UsersUpdateData {
  users: Array<{
    id: string;
    username: string;
    status: string;
    avatar?: string;
    avatarUrl?: string;
    color?: string;
    role?: string;
    ipAddress?: string;
  }>;
}

export function useSocket(events?: Partial<SocketEvents>) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialiser la connexion Socket.IO
  // biome-ignore lint/correctness/useExhaustiveDependencies: only init once
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Événements de connexion
    socket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.IO');
      setIsConnected(true);
      setConnectionError(null);
      events?.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Déconnecté du serveur:', reason);
      setIsConnected(false);
      events?.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
      events?.onError?.(error.message);
    });

    // Événements du chat
    socket.on('message', (data: MessageData) => {
      events?.onMessage?.(data);
    });

    socket.on('user_join', (data: UserJoinData) => {
      events?.onUserJoin?.(data);
    });

    socket.on('user_leave', (data: UserLeaveData) => {
      events?.onUserLeave?.(data);
    });

    socket.on('typing', (data: TypingData) => {
      events?.onTyping?.(data);
    });

    socket.on('stop_typing', (data: TypingData) => {
      events?.onStopTyping?.(data);
    });

    socket.on('user_kicked', (data: KickBanData) => {
      events?.onUserKicked?.(data);
    });

    socket.on('user_banned', (data: KickBanData) => {
      events?.onUserBanned?.(data);
    });

    socket.on('users_update', (data: UsersUpdateData) => {
      events?.onUsersUpdate?.(data);
    });

    // Cleanup
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  // Méthodes pour émettre des événements
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const sendMessage = useCallback((message: Omit<MessageData, 'id' | 'timestamp'>) => {
    emit('send_message', message);
  }, [emit]);

  const joinChat = useCallback((user: { id: string; username: string; avatar?: string; color?: string }) => {
    emit('join', user);
  }, [emit]);

  const leaveChat = useCallback(() => {
    emit('leave');
  }, [emit]);

  const startTyping = useCallback(() => {
    emit('typing');
  }, [emit]);

  const stopTyping = useCallback(() => {
    emit('stop_typing');
  }, [emit]);

  const kickUser = useCallback((userId: string, reason?: string) => {
    emit('kick_user', { userId, reason });
  }, [emit]);

  const banUser = useCallback((userId: string, reason?: string) => {
    emit('ban_user', { userId, reason });
  }, [emit]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    sendMessage,
    joinChat,
    leaveChat,
    startTyping,
    stopTyping,
    kickUser,
    banUser,
  };
}
