// ─────────────────────────────────────────────
//  Chat models — alineados con el backend
// ─────────────────────────────────────────────

export interface LastMessage {
  content: string;
  senderId: string;
  sentAt: string;
}

export type ChatStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type PostCloseGuidanceDecision = 'PENDING' | 'ACCEPTED' | 'DISMISSED';

export interface Chat {
  _id: string;
  oferta: string | { _id: string; sector: string; region: string; companyDescription: string };
  owner: string | { _id: string; fullName: string; email: string };
  interested: string | { _id: string; fullName: string; email: string };
  lastMessage?: LastMessage;
  unreadOwner: number;
  unreadInterested: number;
  isReadOnly: boolean;
  status: ChatStatus;
  closedByOwner?: boolean;
  closedByInterested?: boolean;
  closedAt?: string;
  postCloseGuidanceOwnerDecision?: PostCloseGuidanceDecision;
  postCloseGuidanceInterestedDecision?: PostCloseGuidanceDecision;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRating {
  _id?: string;
  chat: string;
  fromUser: string;
  toUser: string;
  ratedRole: 'OWNER' | 'INTERESTED';
  score: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
//  Mensaje
// ─────────────────────────────────────────────

/** Status local para Optimistic UI (no viene del backend) */
export type MessageStatus = 'sending' | 'sent' | 'error';

export const MESSAGE_TYPES = ['text', 'image', 'file', 'audio', 'video'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface Mensaje {
  _id?: string;
  /** ID local temporal (para Optimistic UI antes del ack) */
  localId?: string;
  chat: string;
  sender: string | { _id: string; fullName: string; email: string };
  content: string;
  messageType?: MessageType;
  s3Key?: string;
  fileUrl?: string; // URL temporal firmada devuelta por el backend
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  /** Solo en el frontend — no persiste en DB */
  status?: MessageStatus;
  createdAt: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
//  Socket event payloads
// ─────────────────────────────────────────────

export interface SendMessageAck {
  ok: boolean;
  message?: Mensaje;
  error?: string;
}

export interface JoinChatAck {
  ok: boolean;
  error?: string;
}

export interface ChatNotificationEvent {
  chatId: string;
  message: Mensaje;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type PresenceStatus = 'online' | 'offline';
