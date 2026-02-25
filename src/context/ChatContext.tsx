// src/context/ChatContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import type { User, Message, SystemMessage } from "../types";


const MODE = import.meta.env.MODE; // ✅ "development" | "production"
const SOCKET_URL =
  MODE === "production"
    ? import.meta.env.VITE_SOCKET_URL_PROD
    : import.meta.env.VITE_SOCKET_URL_DEV;

interface MessageOptions {
  imageUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface PrivateMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar?: string;
  toUserId: string;
  content: string;
  type: "text" | "image" | "gif" | "audio";
  timestamp: string;
}

type TypingUser = { userId: string; username: string };

interface ChatContextType {
  // ✅ AJOUT
  roomSlug: string;

  // État
  fingerPrint: string;
  setFingerPrint: React.Dispatch<React.SetStateAction<string>>;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  systemMessages: SystemMessage[];
  setSystemMessages: React.Dispatch<React.SetStateAction<SystemMessage[]>>;
  onlineUsers: User[];
  typingUsers: TypingUser[];

  // AUTH / LOADING
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // Actions
  addMessage: (content: string, options?: MessageOptions) => void;
  addSystemMessage: (type: SystemMessage["type"], username: string) => void;
  clearMessages: () => void;

  // Socket
  isConnected: boolean;
  connectionError: string | null;
  sendMessage: (content: string, options?: MessageOptions) => void;
  startTyping: () => void;
  stopTyping: () => void;
  kickUser: (userId: string, reason?: string) => void;
  banUser: (userId: string, reason?: string) => void;

  // UI
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  avatarUser: string | null;
  setAvatarUser: (updatedUser: User) => void;

  avatarUserOpen: boolean;
  setAvatarUserOpen: (open: boolean) => void;

  volume: number;
  setVolume: (volume: number) => void;
  showAdminPanel: boolean;
  setShowAdminPanel: (show: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // Webcam
  isWebcamActive: boolean;
  setIsWebcamActive: (active: boolean) => void;
  usersWithWebcam: string[];
  toggleWebcam: () => void;

  // Private Messages
  privateMessages: Map<string, PrivateMessage[]>;
  sendPrivateMessage: (
    toUserId: string,
    content: string,
    type?: "text" | "image" | "gif" | "audio"
  ) => void;
  getPrivateMessages: (userId: string) => PrivateMessage[];
  privateTypingUsers: Map<string, string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Utilisateurs de démonstration
const initialUsers: User[] = [];

const initialMessages: Message[] = [
  {
    id: "1",
    userId: "1",
    username: "Systeme",
    content: "Bienvenue sur le nouveau tchat Pro-videochat",
    timestamp: new Date().toISOString(),
    avatar: "https://robohash.org/robot.png?size=100x100",
    color: "#00d9c0",
  },
];

const initialSystemMessages: SystemMessage[] = [];

export function ChatProvider({
  children,
  roomSlug,
}: {
  children: ReactNode;
  roomSlug: string;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>(
    initialSystemMessages
  );

  // ✅ Typing: on stocke des objets cohérents
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [fingerPrint, setFingerPrint] = useState<string>("");

  // AUTH / LOADING
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // UI
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [avatarUser, setAvatarUserState] = useState<string | null>(null);
  const [avatarUserOpen, setAvatarUserOpen] = useState(false);

  // Webcam
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [usersWithWebcam, setUsersWithWebcam] = useState<string[]>([]);

  // Private Messages
  const [privateMessages, setPrivateMessages] = useState<
    Map<string, PrivateMessage[]>
  >(new Map());
  const [privateTypingUsers, setPrivateTypingUsers] = useState<
    Map<string, string>
  >(new Map());

  // Socket.IO
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Typing helpers
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const onlineUsers = useMemo(
    () => users.filter((user) => user && user.status === "en ligne"),
    [users]
  );

  // ============================================
  // INIT LOADING
  // ============================================
  useEffect(() => {
    const t = setTimeout(() => {
      setIsLoading(false);
    }, 350);

    return () => clearTimeout(t);
  }, []);

  // ============================================
  // ✅ setAvatarUser (callback)
  // ============================================
  const setAvatarUser = useCallback((updatedUser: User) => {
    setAvatarUserState(updatedUser?.avatar || null);

    setCurrentUser((prev) => {
      if (!prev) return prev;
      if (String(prev.id) !== String(updatedUser.id)) return prev;
      return { ...prev, ...updatedUser };
    });

    setUsers((prev) =>
      prev.map((u) =>
        String(u.id) === String(updatedUser.id) ? { ...u, ...updatedUser } : u
      )
    );
  }, []);

  // ============================================
  // Typing (emit)
  // ============================================
  const stopTyping = useCallback(() => {
    if (!currentUser?.id) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit("stop_typing", {
        userId: String(currentUser.id),
        username: currentUser.username || "Anonymous",
      });
    }

    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentUser?.id, currentUser?.username]);

  const startTyping = useCallback(() => {
    if (!currentUser?.id) return;
    if (!socketRef.current?.connected) return;

    if (!isTypingRef.current) {
      socketRef.current.emit("typing", {
        userId: String(currentUser.id),
        username: currentUser.username || "Anonymous",
      });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUser?.id, currentUser?.username, stopTyping]);

  // ✅ cleanup typing timer
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // ============================================
  // SOCKET.IO - Initialisation et écouteurs
  // ============================================
  useEffect(() => {
    // Si pas authentifié => on ferme
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    // Déjà instancié
    if (socketRef.current) return;

    console.log("SOCKET_URL =>", SOCKET_URL);

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ["websocket", "polling"],

        withCredentials: true, // ✅ IMPORTANT pour envoyer le cookie
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connecté au serveur Socket.IO");
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason: Socket.DisconnectReason) => {
      console.log("❌ Déconnecté:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Erreur de connexion Socket.IO:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // --- Chat messages ---
    socket.on("new_message", (msg: Message) => {
      if (!msg) return;
      setMessages((prev) => [...prev, { ...msg }]);
    });

    socket.on("user_join", (data: User[]) => {
      const safe = (data || []).filter(Boolean).map((u) => ({
        ...u,
        status: "en ligne" as const,
      }));
      setUsers(safe);
    });

    socket.on("all_messages", (data: Message[]) => {
      setMessages(data);
    });

    socket.on(
      "user_join_message",
      (data: { id: string; username: string; timestamp?: string }) => {
        if (!data?.username) return;
        setSystemMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "join",
            username: data.username,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    );

    socket.on(
      "user_leave",
      (data: { id: string; username: string; timestamp: string }) => {
        if (!data?.id) return;

        setUsers((prev) => prev.filter((u) => String(u.id) !== String(data.id)));

        setTypingUsers((prev) =>
          prev.filter((u) => String(u.userId) !== String(data.id))
        );

        if (data?.username) {
          setSystemMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "leave",
              username: data.username,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          ]);
        }
      }
    );

    socket.on("user_typing", (data: { userId: string; username: string }) => {
      const userId = data?.userId;
      if (!userId) return;

      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => String(u.userId) !== String(userId));
        return [
          ...filtered,
          { userId: String(userId), username: data.username || "Anonymous" },
        ];
      });
    });

    socket.on("stop_typing", (data: { userId: string }) => {
      const userId = data?.userId;
      if (!userId) return;

      setTypingUsers((prev) =>
        prev.filter((u) => String(u.userId) !== String(userId))
      );
    });

    socket.on(
      "user_kicked",
      (data: { userId: string; username: string; by: string; timestamp: string }) => {
        if (!data?.userId) return;

        setUsers((prev) =>
          prev
            .filter(Boolean)
            .map((u) =>
              String(u.id) === String(data.userId)
                ? { ...u, status: "hors ligne" as const }
                : u
            )
        );

        if (data?.username) {
          setSystemMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "kick",
              username: data.username,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          ]);
        }
      }
    );

    socket.on(
      "user_banned",
      (data: { userId: string; username: string; by: string; timestamp: string }) => {
        if (!data?.userId) return;

        setUsers((prev) =>
          prev
            .filter(Boolean)
            .map((u) =>
              String(u.id) === String(data.userId)
                ? { ...u, status: "hors ligne" as const, banned: true }
                : u
            )
        );

        if (data?.username) {
          setSystemMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "ban",
              username: data.username,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          ]);
        }
      }
    );

    socket.on("users_update", (data: { users: User[] }) => {
      const safe = (data?.users || []).filter(Boolean);
      setUsers(safe);
    });

    socket.on("clear_messages", () => {
      setMessages([]);
      setSystemMessages([]);
    });

    // Webcam events
    socket.on("webcam_users", (list: Array<string | number>) => {
      const safe = (list || []).map((id) => String(id));
      setUsersWithWebcam(safe);
    });

    socket.on("webcam_started", (data: { userId: string; username: string }) => {
      if (!data?.userId) return;
      setUsersWithWebcam((prev) => {
        const id = String(data.userId);
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
    });

    socket.on("webcam_stopped", (data: { userId: string; username: string }) => {
      if (!data?.userId) return;
      setUsersWithWebcam((prev) =>
        prev.filter((id) => String(id) !== String(data.userId))
      );
    });

    // Private message events
    socket.on("private_message_received", (msg: PrivateMessage) => {
      if (!msg?.fromUserId) return;

      // ✅ 1) Envoie l'event global pour que Sidebar incrémente la bulle
      window.dispatchEvent(
        new CustomEvent("privateMessageReceived", {
          detail: {
            fromUserId: msg.fromUserId,
            toUserId: msg.toUserId, // si tu l'as dans ton type
          },
        })
      );

      // ✅ 2) Stocke le message dans ta map
      setPrivateMessages((prev) => {
        const newMap = new Map(prev);
        const key = String(msg.fromUserId);
        const existing = newMap.get(key) || [];
        newMap.set(key, [...existing, msg]);
        return newMap;
      });
    });


    socket.on("private_message_sent", (msg: PrivateMessage) => {
      if (!msg?.toUserId) return;
      setPrivateMessages((prev) => {
        const newMap = new Map(prev);
        const key = String(msg.toUserId);
        const existing = newMap.get(key) || [];
        newMap.set(key, [...existing, msg]);
        return newMap;
      });
    });

    socket.on("private_typing", (data: { fromUserId: string; fromUsername: string }) => {
      if (!data?.fromUserId) return;

      setPrivateTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(String(data.fromUserId), data.fromUsername || "...");
        return newMap;
      });

      setTimeout(() => {
        setPrivateTypingUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(String(data.fromUserId));
          return newMap;
        });
      }, 3000);
    });

    socket.on("private_stop_typing", (data: { fromUserId: string }) => {
      if (!data?.fromUserId) return;
      setPrivateTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(String(data.fromUserId));
        return newMap;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // User login emit
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isConnected) return;
    if (!currentUser?.id) return;

    socketRef.current?.emit("user_login", currentUser.id);
  }, [isAuthenticated, isConnected, currentUser?.id]);

  // JOIN automatique quand socket connecté + user prêt
  // biome-ignore lint/correctness/useExhaustiveDependencies: isConnected needed to trigger join after connection
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    if (!currentUser?.id) return;
    if (!isAuthenticated) return;

    socketRef.current.emit("join", {
      id: currentUser.id,
      username: currentUser.username || "Anonymous",
      avatar: currentUser.avatar,
      avatarUrl: currentUser.avatarUrl,
      color: currentUser.color,
      role: currentUser.role,
    });
  }, [currentUser, isAuthenticated, isConnected]);

  // ============================================
  // AUTH
  // ============================================
  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);

    const found = initialUsers.find(
      (u) => u.username === username && u.password === password
    );

    await new Promise((r) => setTimeout(r, 300));

    if (!found) {
      setIsLoading(false);
      throw new Error("Identifiants invalides");
    }

    setCurrentUser(found);
    setIsAuthenticated(true);
    setIsLoading(false);

    if (socketRef.current?.connected) {
      socketRef.current.emit("join", {
        id: found.id,
        username: found.username || "Anonymous",
        avatar: found.avatar,
        avatarUrl: found.avatarUrl,
        color: found.color,
        role: found.role,
      });
    }
  }, []);

  const logout = useCallback(() => {
    stopTyping();

    if (isWebcamActive && socketRef.current?.connected && currentUser?.id) {
      socketRef.current.emit("webcam_stop", {
        userId: currentUser.id,
        username: currentUser.username || "Anonymous",
      });
      setIsWebcamActive(false);
    }

    setIsAuthenticated(false);
    setCurrentUser(null);
    setTypingUsers([]);
  }, [stopTyping, isWebcamActive, currentUser?.id, currentUser?.username]);

  // ============================================
  // Webcam
  // ============================================
  const toggleWebcam = useCallback(() => {
    if (!currentUser?.id) return;

    const newState = !isWebcamActive;
    setIsWebcamActive(newState);

    if (socketRef.current?.connected) {
      if (newState) {
        socketRef.current.emit("webcam_start", {
          userId: currentUser.id,
          username: currentUser.username || "Anonymous",
        });
        setUsersWithWebcam((prev) => {
          const me = String(currentUser.id);
          if (prev.includes(me)) return prev;
          return [...prev, me];
        });
      } else {
        socketRef.current.emit("webcam_stop", {
          userId: currentUser.id,
          username: currentUser.username || "Anonymous",
        });
        setUsersWithWebcam((prev) =>
          prev.filter((id) => String(id) !== String(currentUser.id))
        );
      }
    }
  }, [currentUser, isWebcamActive]);

  // ============================================
  // Private Messages
  // ============================================
  const sendPrivateMessage = useCallback(
    (
      toUserId: string,
      content: string,
      type: "text" | "image" | "gif" | "audio" = "text"
    ) => {
      if (!currentUser?.id) return;

      if (socketRef.current?.connected) {
        socketRef.current.emit("private_message", {
          toUserId,
          content,
          type,
        });
      } else {
        const newMessage: PrivateMessage = {
          id: `pm-${Date.now()}`,
          fromUserId: String(currentUser.id),
          fromUsername: currentUser.username || "Anonymous",
          fromAvatar: currentUser.avatar,
          toUserId: String(toUserId),
          content,
          type,
          timestamp: new Date().toISOString(),
        };

        setPrivateMessages((prev) => {
          const newMap = new Map(prev);
          const key = String(toUserId);
          const existing = newMap.get(key) || [];
          newMap.set(key, [...existing, newMessage]);
          return newMap;
        });
      }
    },
    [currentUser]
  );

  const getPrivateMessages = useCallback(
    (userId: string): PrivateMessage[] => {
      return privateMessages.get(String(userId)) || [];
    },
    [privateMessages]
  );

  // ============================================
  // Actions - Messages
  // ============================================
  const sendMessage = useCallback(
    (content: string, options?: MessageOptions) => {
      if (!currentUser?.id) return;

      const messageData = {
        userId: currentUser.id,
        username: currentUser.username || "Anonymous",
        content,
        avatar: currentUser.avatar,
        avatarUrl: currentUser.avatarUrl,
        isAdmin:
          currentUser.role === "admin" || currentUser.role === "administrateur",
        color: currentUser.color,
        ...options,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", messageData);
      } else {
        const newMessage: Message = {
          id: Date.now().toString(),
          ...messageData,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMessage]);
      }

      stopTyping();
    },
    [currentUser, stopTyping]
  );

  const addMessage = useCallback(
    (content: string, options?: MessageOptions) => {
      sendMessage(content, options);
    },
    [sendMessage]
  );

  const addSystemMessage = useCallback(
    (type: SystemMessage["type"], username: string) => {
      const safeUsername = username || "Anonymous";
      const newSystemMessage: SystemMessage = {
        id: Date.now().toString(),
        type,
        username: safeUsername,
        timestamp: new Date().toISOString(),
      };
      setSystemMessages((prev) => [...prev, newSystemMessage]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("clear_messages");
    }
    setMessages([]);
    setSystemMessages([]);
  }, []);

  // ============================================
  // Admin actions
  // ============================================
  const kickUser = useCallback(
    (userId: string, reason?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("kick_user", { userId, reason });
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            String(u.id) === String(userId)
              ? { ...u, status: "hors ligne" as const }
              : u
          )
        );
        const user = users.find((u) => String(u.id) === String(userId));
        if (user) addSystemMessage("kick", user.username || "Anonymous");
      }
    },
    [users, addSystemMessage]
  );

  const banUser = useCallback(
    (userId: string, reason?: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("ban_user", { userId, reason });
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            String(u.id) === String(userId)
              ? { ...u, status: "hors ligne" as const, banned: true }
              : u
          )
        );
        const user = users.find((u) => String(u.id) === String(userId));
        if (user) addSystemMessage("ban", user.username || "Anonymous");
      }
    },
    [users, addSystemMessage]
  );

  // ============================================
  // Provider value
  // ============================================
  const value = useMemo<ChatContextType>(
    () => ({
      roomSlug, // ✅ AJOUT

      fingerPrint,
      setFingerPrint,
      isAuthenticated,
      setIsAuthenticated,
      currentUser,
      setCurrentUser,
      users,
      setUsers,
      messages,
      setMessages,
      systemMessages,
      setSystemMessages,
      onlineUsers,
      typingUsers,

      isLoading,
      login,
      logout,

      addMessage,
      addSystemMessage,
      clearMessages,

      isConnected,
      connectionError,
      sendMessage,
      startTyping,
      stopTyping,
      kickUser,
      banUser,

      isPlaying,
      setIsPlaying,
      avatarUser,
      setAvatarUser,
      avatarUserOpen,
      setAvatarUserOpen,

      volume,
      setVolume,
      showAdminPanel,
      setShowAdminPanel,
      isMobileSidebarOpen,
      setIsMobileSidebarOpen,

      isWebcamActive,
      setIsWebcamActive,
      usersWithWebcam,
      toggleWebcam,

      privateMessages,
      sendPrivateMessage,
      getPrivateMessages,
      privateTypingUsers,
    }),
    [
      roomSlug, // ✅ AJOUT
      fingerPrint,
      isAuthenticated,
      currentUser,
      users,
      messages,
      systemMessages,
      onlineUsers,
      typingUsers,
      isLoading,
      login,
      logout,
      addMessage,
      addSystemMessage,
      clearMessages,
      isConnected,
      connectionError,
      sendMessage,
      startTyping,
      stopTyping,
      kickUser,
      banUser,
      isPlaying,
      avatarUser,
      setAvatarUser,
      avatarUserOpen,
      volume,
      showAdminPanel,
      isMobileSidebarOpen,
      isWebcamActive,
      usersWithWebcam,
      toggleWebcam,
      privateMessages,
      sendPrivateMessage,
      getPrivateMessages,
      privateTypingUsers,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
