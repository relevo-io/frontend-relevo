import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { Mensaje, Chat, ConnectionStatus, PresenceStatus } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TranslateModule],
  templateUrl: './chat-room.component.html',
  styleUrl: './chat-room.component.css'
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private destroy$ = new Subject<void>();
  private typingInput$ = new Subject<string>();
  private subscriptions: Subscription[] = [];

  // ── State ───────────────────────────────────
  chat = signal<Chat | null>(null);
  messages = signal<Mensaje[]>([]);
  messageInput = signal('');
  isLoading = signal(true);
  isLoadingMore = signal(false);
  isSending = signal(false);
  hasMoreMessages = signal(true);
  showNewMessageBanner = signal(false);
  isAtBottom = signal(true);
  chatId = signal('');

  // ── Real-time signals ────────────────────────
  connectionStatus = signal<ConnectionStatus>('disconnected');
  presenceStatus = signal<PresenceStatus>('offline');
  typingUserId = signal<string | null>(null);

  // ── Computed ─────────────────────────────────
  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');
  isReadOnly = computed(() => this.chat()?.isReadOnly ?? false);
  isPendingApproval = computed(() => this.chat()?.status === 'PENDING_APPROVAL');
  
  isOwnerOfOffer = computed(() => {
    const c = this.chat();
    if (!c) return false;
    const ownerId = typeof c.owner === 'object' ? c.owner._id : c.owner;
    return ownerId === this.currentUserId();
  });

  canReply = computed(() => {
    const c = this.chat();
    if (!c) return false;
    if (c.isReadOnly) return false;
    if (c.status === 'PENDING_APPROVAL') return false;
    if (c.status === 'REJECTED') return false;
    return true;
  });

  otherParticipantName = computed(() => {
    const c = this.chat();
    if (!c) return '';
    const userId = this.currentUserId();
    const owner = c.owner as { _id: string; fullName: string } | string;
    const interested = c.interested as { _id: string; fullName: string } | string;

    if (typeof owner === 'object' && owner._id !== userId) return owner.fullName;
    if (typeof interested === 'object' && interested._id !== userId) return interested.fullName;
    return 'Usuario';
  });

  ofertaInfo = computed(() => {
    const c = this.chat();
    if (!c || typeof c.oferta === 'string') return null;
    return c.oferta as { _id: string; sector: string; region: string };
  });

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('chatId') ?? '';
    this.chatId.set(id);
    this.loadChatAndHistory(id);
    this.subscribeToRealtime(id);
    this.setupTypingDebounce(id);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.chatId()) {
      this.chatService.leaveChat(this.chatId());
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ─────────────────────────────────────────────
  //  Initialization
  // ─────────────────────────────────────────────

  private async loadChatAndHistory(chatId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      // Load chat metadata
      const chats = await this.chatService.getMyChats().toPromise();
      const chat = chats?.find(c => c._id === chatId);
      this.chat.set(chat ?? null);

      // Load initial message history (last 30)
      const msgs = await this.chatService.getMessages(chatId).toPromise();
      this.messages.set(msgs ?? []);
      this.hasMoreMessages.set((msgs?.length ?? 0) >= 30);

      this.shouldScrollToBottom = true;

      // Join socket room
      this.chatService.connect();
      this.chatService.joinChat(chatId);
      this.chatService.markAsRead(chatId);
    } catch (err) {
      console.error('[ChatRoom] Failed to load chat:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private subscribeToRealtime(chatId: string): void {
    // Incoming messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        // Filter messages for this chat only
        if (msg.chat !== chatId) return;

        // Replace optimistic message if it matches localId
        const existing = this.messages().findIndex(m => m.localId && m.localId === (msg as any).localId);
        if (existing !== -1) {
          const updated = [...this.messages()];
          updated[existing] = { ...msg, status: 'sent' };
          this.messages.set(updated);
        } else {
          this.messages.set([...this.messages(), { ...msg, status: 'sent' }]);
        }

        // Scroll smart logic
        if (this.isAtBottom()) {
          this.shouldScrollToBottom = true;
          this.chatService.markAsRead(chatId);
        } else {
          this.showNewMessageBanner.set(true);
        }
      });

    // Typing
    this.chatService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userId => this.typingUserId.set(userId));

    // Connection status
    this.chatService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => this.connectionStatus.set(status));

    // Presence
    this.chatService.presence$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => this.presenceStatus.set(status));
  }

  private setupTypingDebounce(chatId: string): void {
    this.typingInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        if (value.length > 0) {
          this.chatService.sendTypingStart(chatId);
        } else {
          this.chatService.sendTypingStop(chatId);
        }
      });
  }

  // ─────────────────────────────────────────────
  //  User actions
  // ─────────────────────────────────────────────

  onInputChange(value: string): void {
    this.messageInput.set(value);
    this.typingInput$.next(value);
  }

  async sendMessage(): Promise<void> {
    const content = this.messageInput().trim();
    if (!content || this.isSending() || this.isReadOnly()) return;

    const chatId = this.chatId();
    const localId = `local_${Date.now()}`;
    const userId = this.currentUserId();

    // Optimistic UI: add message immediately with 'sending' status
    const optimisticMsg: Mensaje = {
      localId,
      chat: chatId,
      sender: userId,
      content,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    this.messages.set([...this.messages(), optimisticMsg]);
    this.messageInput.set('');
    this.chatService.sendTypingStop(chatId);
    this.shouldScrollToBottom = true;
    this.isSending.set(true);

    try {
      const ack = await this.chatService.sendMessage(chatId, content);

      if (ack.ok && ack.message) {
        // Replace optimistic with confirmed message
        const updated = this.messages().map(m =>
          m.localId === localId
            ? { ...ack.message!, status: 'sent' as const }
            : m
        );
        this.messages.set(updated);
      } else {
        // Mark as error for retry
        const updated = this.messages().map(m =>
          m.localId === localId ? { ...m, status: 'error' as const } : m
        );
        this.messages.set(updated);
      }
    } catch {
      const updated = this.messages().map(m =>
        m.localId === localId ? { ...m, status: 'error' as const } : m
      );
      this.messages.set(updated);
    } finally {
      this.isSending.set(false);
    }
  }

  async updateStatus(newStatus: 'APPROVED' | 'REJECTED'): Promise<void> {
    const id = this.chatId();
    this.isLoading.set(true);
    try {
      const updated = await this.chatService.updateChatStatus(id, newStatus).toPromise();
      if (updated) {
        this.chat.set(updated);
      }
    } catch (err) {
      console.error('[ChatRoom] Error updating status:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async retryMessage(msg: Mensaje): Promise<void> {
    if (!msg.localId) return;

    const updated = this.messages().map(m =>
      m.localId === msg.localId ? { ...m, status: 'sending' as const } : m
    );
    this.messages.set(updated);

    const ack = await this.chatService.sendMessage(this.chatId(), msg.content);
    if (ack.ok && ack.message) {
      const final = this.messages().map(m =>
        m.localId === msg.localId ? { ...ack.message!, status: 'sent' as const } : m
      );
      this.messages.set(final);
    } else {
      const errored = this.messages().map(m =>
        m.localId === msg.localId ? { ...m, status: 'error' as const } : m
      );
      this.messages.set(errored);
    }
  }

  async loadMoreMessages(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMoreMessages()) return;
    this.isLoadingMore.set(true);

    const firstMsg = this.messages()[0];
    const before = firstMsg?.createdAt;

    try {
      const older = await this.chatService.getMessages(this.chatId(), before).toPromise();
      if (!older || older.length === 0) {
        this.hasMoreMessages.set(false);
        return;
      }
      this.messages.set([...older, ...this.messages()]);
      this.hasMoreMessages.set(older.length >= 30);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this.isAtBottom.set(atBottom);

    if (atBottom) {
      this.showNewMessageBanner.set(false);
      this.chatService.markAsRead(this.chatId());
    }

    // Load more if scrolled to top
    if (el.scrollTop < 50) {
      this.loadMoreMessages();
    }
  }

  scrollToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
      this.showNewMessageBanner.set(false);
    } catch { /* ignore */ }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isMine(msg: Mensaje): boolean {
    const senderId = typeof msg.sender === 'object' ? (msg.sender as { _id: string })._id : msg.sender;
    return senderId === this.currentUserId();
  }

  getSenderName(msg: Mensaje): string {
    if (typeof msg.sender === 'object') return (msg.sender as { fullName: string }).fullName;
    return '';
  }
}
