import { Injectable, inject, PLATFORM_ID, OnDestroy, NgZone, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  Chat,
  ChatNotificationEvent,
  ChatRating,
  Mensaje,
  SendMessageAck,
  JoinChatAck,
  ConnectionStatus,
  PresenceStatus,
  MessageType
} from '../models/chat.model';
import { NotificationHistory } from '../models/notification.model';
import { Solicitud, SolicitudDeletedEvent } from '../models/solicitud.model';

const API_URL = `${environment.apiUrl}/api`;
const SOCKET_URL = new URL(environment.apiUrl).origin;

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const loggedIn = this.authService.isLoggedIn();
        if (loggedIn) {
          this.connect();
        } else {
          this.disconnect();
        }
      });
    }
  }

  // ── Socket instance ─────────────────────────
  private socket: Socket | null = null;
  private activeChatId: string | null = null;

  // ── Observables (Subjects) ──────────────────
  private messagesSubject = new Subject<Mensaje>();
  private typingSubject = new BehaviorSubject<string | null>(null);
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  private presenceSubject = new BehaviorSubject<PresenceStatus>('offline');
  private notificationsSubject = new Subject<{ chatId: string; message: Mensaje }>();
  private totalUnreadSubject = new BehaviorSubject<number>(0);
  private newNotificationSubject = new Subject<NotificationHistory>();
  private chatUpdatedSubject = new Subject<Chat>();
  private solicitudUpdatedSubject = new Subject<Solicitud>();
  private solicitudDeletedSubject = new Subject<SolicitudDeletedEvent>();
  private chatsCache = new Map<string, Chat>();

  /** Stream de mensajes nuevos entrantes */
  readonly messages$ = this.messagesSubject.asObservable();
  /** Notificaciones globales (para actualizar listados) */
  readonly notifications$ = this.notificationsSubject.asObservable();
  /** Conteo total de mensajes no leídos */
  readonly totalUnread$ = this.totalUnreadSubject.asObservable();
  /** Notificaciones de historial en tiempo real */
  readonly newNotification$ = this.newNotificationSubject.asObservable();
  /** Actualizaciones de chats no ligadas solo a mensajes */
  readonly chatUpdated$ = this.chatUpdatedSubject.asObservable();
  /** Actualizaciones de solicitudes */
  readonly solicitudUpdated$ = this.solicitudUpdatedSubject.asObservable();
  /** Eliminación de solicitudes */
  readonly solicitudDeleted$ = this.solicitudDeletedSubject.asObservable();
  /** Stream del userId que está escribiendo (null si no hay nadie) */
  readonly typing$ = this.typingSubject.asObservable();
  /** Estado de la conexión socket */
  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();
  /** Presencia del otro participante en el chat activo */
  readonly presence$ = this.presenceSubject.asObservable();

  // ─────────────────────────────────────────────
  //  Connection management
  // ─────────────────────────────────────────────

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = this.authService.getToken();
    if (!token) return;

    // Si el socket ja existeix però el token ha canviat (canvi d'usuari), desconnectem
    if (this.socket) {
      const auth = this.socket.auth;
      const socketToken = typeof auth === 'object' && auth !== null ? (auth as Record<string, unknown>)['token'] : null;

      if (socketToken === `Bearer ${token}`) return;

      console.warn('[ChatService] Token mismatch detected, reconnecting socket...');
      this.disconnect();
    }

    // Run socket initialization outside Angular to avoid infinite change detection loops
    this.ngZone.runOutsideAngular(() => {
      this.socket = io(SOCKET_URL, {
        // JWT viaja en auth object, NO en query params
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.registerSocketEvents();
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.activeChatId = null;
    this.chatsCache.clear();
    this.connectionStatusSubject.next('disconnected');
    this.presenceSubject.next('offline');
    this.totalUnreadSubject.next(0);
  }

  private registerSocketEvents(): void {
    if (!this.socket) return;

    // ── Connection lifecycle ──────────────────────
    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next('connected');
        // Re-join room automáticamente tras reconexión
        if (this.activeChatId) {
          this.joinChat(this.activeChatId);
        }
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next('disconnected');
        this.presenceSubject.next('offline');
      });
    });

    this.socket.on('connect_error', () => {
      this.ngZone.run(() => this.connectionStatusSubject.next('reconnecting'));
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.ngZone.run(() => this.connectionStatusSubject.next('reconnecting'));
    });

    // ── Chat events ───────────────────────────────
    this.socket.on('new_message', (mensaje: Mensaje) => {
      this.ngZone.run(() => this.messagesSubject.next(mensaje));
    });

    this.socket.on('typing_start', ({ userId }: { userId: string }) => {
      this.ngZone.run(() => this.typingSubject.next(userId));
    });

    this.socket.on('typing_stop', () => {
      this.ngZone.run(() => this.typingSubject.next(null));
    });

    this.socket.on('user_online', () => {
      this.ngZone.run(() => this.presenceSubject.next('online'));
    });

    this.socket.on('user_offline', () => {
      this.ngZone.run(() => this.presenceSubject.next('offline'));
    });

    this.socket.on('chat_notification', (data: { chatId: string; message: Mensaje }) => {
      this.ngZone.run(() => {
        this.notificationsSubject.next(data);
        this.applyChatNotification(data);
      });
    });

    this.socket.on('chat_updated', (chat: Chat) => {
      this.ngZone.run(() => {
        this.upsertChatInCache(chat);
        this.chatUpdatedSubject.next(chat);
      });
    });

    this.socket.on('solicitud_updated', (solicitud: Solicitud) => {
      this.ngZone.run(() => this.solicitudUpdatedSubject.next(solicitud));
    });

    this.socket.on('solicitud_deleted', (payload: SolicitudDeletedEvent) => {
      this.ngZone.run(() => this.solicitudDeletedSubject.next(payload));
    });

    this.socket.on('new_notification', (notif: NotificationHistory) => {
      this.ngZone.run(() => {
        this.newNotificationSubject.next(notif);
      });
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[ChatService] Socket error:', error.message);
    });
  }

  // ─────────────────────────────────────────────
  //  Socket actions
  // ─────────────────────────────────────────────

  joinChat(chatId: string): void {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.activeChatId = chatId;
    // Reiniciar presencia localmente antes de unirse
    this.presenceSubject.next('offline');

    this.socket?.emit('join_chat', { chatId }, (ack: JoinChatAck & { isOnline?: boolean }) => {
      if (!ack.ok) {
        console.error('[ChatService] join_chat failed:', ack.error);
      } else if (ack.isOnline) {
        this.ngZone.run(() => this.presenceSubject.next('online'));
      }
    });
  }

  leaveChat(chatId: string): void {
    if (this.activeChatId === chatId) {
      this.activeChatId = null;
    }
    this.socket?.emit('leave_chat', { chatId });
    this.presenceSubject.next('offline');
  }

  /**
   * Envía un mensaje (puede contener texto y/o metadatos de un archivo).
   */
  sendMessage(
    chatId: string,
    content: string,
    fileData?: {
      messageType: MessageType;
      s3Key: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }
  ): Promise<SendMessageAck> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'No hay conexión' });
        return;
      }
      this.socket.emit('send_message', { chatId, content, ...fileData }, (ack: SendMessageAck) => resolve(ack));
    });
  }

  /** Obtiene la URL pre-firmada para subir un archivo adjunto del chat */
  getPresignedChatUrl(filename: string, mimeType: string): Observable<{ uploadUrl: string; s3Key: string }> {
    const params = new HttpParams().set('filename', filename).set('mimeType', mimeType);
    return this.http.get<{ uploadUrl: string; s3Key: string }>(`${API_URL}/storage/chat-presigned-url`, { params });
  }

  /** Sube un archivo binario directamente a S3 omitiendo la cabecera JWT */
  uploadFileToS3(uploadUrl: string, file: File): Observable<void> {
    return this.http.put<void>(uploadUrl, file, {
      headers: { skipAuth: 'true' }
    });
  }

  sendTypingStart(chatId: string): void {
    this.socket?.emit('typing_start', { chatId });
  }

  sendTypingStop(chatId: string): void {
    this.socket?.emit('typing_stop', { chatId });
  }

  markAsRead(chatId: string): void {
    this.socket?.emit('mark_read', { chatId });
  }

  // ─────────────────────────────────────────────
  //  REST API
  // ─────────────────────────────────────────────

  /** Crea o recupera el chat para una oferta */
  getOrCreateChat(ofertaId: string, interestedId?: string): Observable<Chat> {
    return this.http.post<Chat>(`${API_URL}/chats`, { ofertaId, interestedId }).pipe(
      tap((chat) => {
        this.upsertChatInCache(chat);
        this.chatUpdatedSubject.next(chat);
      })
    );
  }

  /** Lista de mis chats activos */
  getMyChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${API_URL}/chats`).pipe(
      tap((chats: Chat[]) => {
        this.replaceChatCache(chats);
      })
    );
  }

  /**
   * Historial de mensajes con paginación por cursor.
   * @param before ISO date string — carga mensajes anteriores a esta fecha
   */
  getMessages(chatId: string, before?: string, limit = 30): Observable<Mensaje[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (before) params = params.set('before', before);
    return this.http.get<Mensaje[]>(`${API_URL}/chats/${chatId}/messages`, { params });
  }

  /** Marca mensajes como leídos vía REST (fallback si el socket no está disponible) */
  markChatAsRead(chatId: string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${API_URL}/chats/${chatId}/read`, {}).pipe(
      tap(() => {
        // Podríamos recalcular el total o simplemente recargar
        this.getMyChats().subscribe();
      })
    );
  }

  /** Actualiza el estado de aprobación de un chat (APPROVED / REJECTED) */
  updateChatStatus(chatId: string, status: 'APPROVED' | 'REJECTED'): Observable<Chat> {
    return this.http.patch<Chat>(`${API_URL}/chats/${chatId}/status`, { status }).pipe(
      tap((chat) => {
        this.upsertChatInCache(chat);
        this.chatUpdatedSubject.next(chat);
      })
    );
  }

  closeDeal(chatId: string): Observable<Chat> {
    return this.http.post<Chat>(`${API_URL}/chats/${chatId}/close`, {}).pipe(
      tap((chat) => {
        this.upsertChatInCache(chat);
        this.chatUpdatedSubject.next(chat);
      })
    );
  }

  setPostCloseGuidanceDecision(chatId: string, decision: 'ACCEPTED' | 'DISMISSED'): Observable<Chat> {
    return this.http.post<Chat>(`${API_URL}/chats/${chatId}/post-close-guidance`, { decision }).pipe(
      tap((chat) => {
        this.upsertChatInCache(chat);
        this.chatUpdatedSubject.next(chat);
      })
    );
  }

  getMyChatRating(chatId: string): Observable<{ rating: ChatRating | null }> {
    return this.http.get<{ rating: ChatRating | null }>(`${API_URL}/chats/${chatId}/my-rating`);
  }

  rateChat(chatId: string, score: number, comment?: string): Observable<ChatRating> {
    return this.http.post<ChatRating>(`${API_URL}/chats/${chatId}/rating`, { score, comment });
  }

  // ─────────────────────────────────────────────
  //  Cleanup
  // ─────────────────────────────────────────────

  ngOnDestroy(): void {
    this.disconnect();
  }

  private applyChatNotification(data: ChatNotificationEvent): void {
    const cachedChat = this.chatsCache.get(data.chatId);
    if (cachedChat) {
      const senderId = typeof data.message.sender === 'object' ? data.message.sender._id : data.message.sender;
      const updatedChat: Chat = {
        ...cachedChat,
        lastMessage: {
          content: data.message.content,
          senderId,
          sentAt: data.message.createdAt
        },
        updatedAt: data.message.createdAt
      };

      const currentUserId = this.authService.currentUser()?._id ?? '';
      const ownerId = typeof updatedChat.owner === 'object' ? updatedChat.owner._id : updatedChat.owner;
      if (ownerId === currentUserId) {
        updatedChat.unreadOwner += 1;
      } else {
        updatedChat.unreadInterested += 1;
      }

      this.upsertChatInCache(updatedChat);
      return;
    }

    this.totalUnreadSubject.next(this.totalUnreadSubject.value + 1);
  }

  private replaceChatCache(chats: Chat[]): void {
    this.chatsCache = new Map(chats.map((chat) => [chat._id, chat]));
    this.recalculateUnreadTotal();
  }

  private upsertChatInCache(chat: Chat): void {
    this.chatsCache.set(chat._id, chat);
    this.recalculateUnreadTotal();
  }

  private recalculateUnreadTotal(): void {
    const currentUserId = this.authService.currentUser()?._id ?? '';
    const total = Array.from(this.chatsCache.values()).reduce((sum, chat) => {
      const ownerId = typeof chat.owner === 'object' ? chat.owner._id : chat.owner;
      return sum + (ownerId === currentUserId ? chat.unreadOwner : chat.unreadInterested);
    }, 0);
    this.totalUnreadSubject.next(total);
  }
}
