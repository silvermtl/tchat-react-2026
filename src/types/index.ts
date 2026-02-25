export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  age?: number;
  gender?: 'homme' | 'femme' | null;
  role: 'admin' | 'administrateur' | 'utilisateur';
  ipAddress?: string;
  status: 'en ligne' | 'hors ligne';
  avatar?: string;
  avatarUrl?: string;
  registeredAt?: string;
  color?: string;
  banned?: boolean;
  webcamActive?: boolean;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  avatar?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  color?: string;
  // Media attachments
  imageUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface SystemMessage {
  id: string;
  type: 'join' | 'leave' | 'kick' | 'ban';
  username: string;
  timestamp: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  messages: Message[];
  systemMessages: SystemMessage[];
}
