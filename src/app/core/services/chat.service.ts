import { Injectable, inject, PLATFORM_ID, OnDestroy, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  Chat,
  Mensaje,
  SendMessageAck,
  JoinChatAck,
  ConnectionStatus,
  PresenceStatus
} from '../models/chat.model';

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

  // ── Socket instance ─────────────────────────
  private socket: Socket | null = null;
  private activeChatId: string | null = null;

  // ── Observables (Subjects) ──────────────────
  private messagesSubject = new Subject<Mensaje>();
  private typingSubject = new BehaviorSubject<string | null>(null);
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  private presenceSubject = new BehaviorSubject<PresenceStatus>('offline');

  /** Stream de mensajes nuevos entrantes */
  readonly messages$ = this.messagesSubject.asObservable();
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
    // CRITICAL FIX: Check if socket instance exists, not just if it is connected.
    // Otherwise, async connections create multiple sockets.
    if (this.socket) return;

    const token = this.authService.getToken();
    if (!token) return;

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
    this.connectionStatusSubject.next('disconnected');
    this.presenceSubject.next('offline');
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
   * Envía un mensaje. Devuelve una Promise con el ack del servidor.
   * El llamador puede mostrar el mensaje en modo 'sending' y actualizar según el ack.
   */
  sendMessage(chatId: string, content: string): Promise<SendMessageAck> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'No hay conexión' });
        return;
      }
      this.socket.emit(
        'send_message',
        { chatId, content },
        (ack: SendMessageAck) => resolve(ack)
      );
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
  getOrCreateChat(ofertaId: string): Observable<Chat> {
    return this.http.post<Chat>(`${API_URL}/chats`, { ofertaId });
  }

  /** Lista de mis chats activos */
  getMyChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${API_URL}/chats`);
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
  markReadRest(chatId: string): Observable<void> {
    return this.http.patch<void>(`${API_URL}/chats/${chatId}/read`, {});
  }

  // ─────────────────────────────────────────────
  //  Cleanup
  // ─────────────────────────────────────────────

  ngOnDestroy(): void {
    this.disconnect();
  }
}
