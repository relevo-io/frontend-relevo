export interface SolicitudAcceso {
  id?: string;
  oportunidadId: string;
  userId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
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