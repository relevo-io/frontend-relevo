// ─────────────────────────────────────────────
//  Chat models — alineados con el backend
// ─────────────────────────────────────────────

export interface LastMessage {
  content: string;
  senderId: string;
  sentAt: string;
}

export interface Chat {
  _id: string;
  oferta: string | { _id: string; sector: string; region: string; companyDescription: string };
  owner: string | { _id: string; fullName: string; email: string };
  interested: string | { _id: string; fullName: string; email: string };
  lastMessage?: LastMessage;
  unreadOwner: number;
  unreadInterested: number;
  isReadOnly: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
//  Mensaje
// ─────────────────────────────────────────────

/** Status local para Optimistic UI (no viene del backend) */
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Mensaje {
  _id?: string;
  /** ID local temporal (para Optimistic UI antes del ack) */
  localId?: string;
  chat: string;
  sender: string | { _id: string; fullName: string; email: string };
  content: string;
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

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type PresenceStatus = 'online' | 'offline';
