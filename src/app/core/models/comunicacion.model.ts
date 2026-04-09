export interface SolicitudAcceso {
  _id?: string;
  oferta: string;
  interestedUser: string;
  owner: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface Conversacion {
  id?: string;
  solicitudId: string;
  isActive: boolean;
}

export interface Mensaje {
  id?: string;
  conversacionId: string;
  senderId: string;
  content: string;
  sentAt: Date;
  readAt?: Date;
}