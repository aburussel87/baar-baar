export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  publicKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  sender?: User;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  conversationId: string;
  joinedAt: string;
  user: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
}
