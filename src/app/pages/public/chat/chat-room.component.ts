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
import { isPlatformBrowser, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Mensaje,
  Chat,
  ChatRating,
  ConnectionStatus,
  PresenceStatus,
  MessageType,
  PostCloseGuidanceDecision
} from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, TranslateModule],
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
  private chatChanged$ = new Subject<void>();
  private typingInput$ = new Subject<string>();
  private subscriptions: Subscription[] = [];

  // ── State ───────────────────────────────────
  chat = signal<Chat | null>(null);
  messages = signal<Mensaje[]>([]);
  messageInput = signal('');
  isLoading = signal(true);
  isLoadingMore = signal(false);
  isSending = signal(false);
  isUploadingFile = signal(false);
  isRecording = signal(false);
  recordingDuration = signal(0);
  hasMoreMessages = signal(true);
  showNewMessageBanner = signal(false);
  isAtBottom = signal(true);
  chatId = signal('');
  myRating = signal<ChatRating | null>(null);
  ratingScore = signal(0);
  ratingHover = signal(0);
  ratingComment = signal('');
  isClosingDeal = signal(false);
  isSendingRating = signal(false);
  isSavingGuidanceDecision = signal(false);

  // ── MediaRecorder properties ────────────────
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;
  private audioStream: MediaStream | null = null;

  // ── Real-time signals ────────────────────────
  connectionStatus = signal<ConnectionStatus>('disconnected');
  presenceStatus = signal<PresenceStatus>('offline');
  typingUserId = signal<string | null>(null);

  // ── Computed ─────────────────────────────────
  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');
  isReadOnly = computed(() => this.chat()?.isReadOnly ?? false);
  isPendingApproval = computed(() => this.chat()?.status === 'PENDING_APPROVAL');
  isDealClosed = computed(() => Boolean(this.chat()?.closedAt));

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

  hasConfirmedDeal = computed(() => {
    const c = this.chat();
    if (!c) return false;
    return this.isOwnerOfOffer() ? Boolean(c.closedByOwner) : Boolean(c.closedByInterested);
  });

  isWaitingOtherDealConfirmation = computed(() => {
    const c = this.chat();
    if (!c) return false;
    if (this.isDealClosed()) return false;
    if (!this.hasConfirmedDeal()) return false;
    return this.isOwnerOfOffer() ? !c.closedByInterested : !c.closedByOwner;
  });

  canShowDealClosePanel = computed(() => {
    const c = this.chat();
    if (!c) return false;
    return c.status === 'APPROVED' && !this.isDealClosed();
  });

  canRateClosedDeal = computed(() => this.isDealClosed() && !this.myRating());

  myPostCloseGuidanceDecision = computed<PostCloseGuidanceDecision>(() => {
    const c = this.chat();
    if (!c) return 'PENDING';

    const decision = this.isOwnerOfOffer() ? c.postCloseGuidanceOwnerDecision : c.postCloseGuidanceInterestedDecision;
    return decision ?? 'PENDING';
  });

  shouldShowPostCloseGuidancePrompt = computed(
    () => this.isDealClosed() && this.myPostCloseGuidanceDecision() === 'PENDING'
  );

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

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.chatId()) {
        this.chatService.sendTypingStop(this.chatId());
        this.chatService.leaveChat(this.chatId());
      }
    } else {
      if (this.chatId()) {
        this.chatService.joinChat(this.chatId());
        this.chatService.markAsRead(this.chatId());
      }
    }
  };

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('chatId') ?? '';
      const oldId = this.chatId();

      if (id !== oldId) {
        if (oldId) {
          this.chatService.sendTypingStop(oldId);
          this.chatService.leaveChat(oldId);
        }

        this.chatChanged$.next();

        // Reset state before loading new chat
        this.chatId.set(id);
        this.messages.set([]);
        this.chat.set(null);
        this.myRating.set(null);
        this.ratingScore.set(0);
        this.ratingHover.set(0);
        this.ratingComment.set('');
        this.typingUserId.set(null);
        this.presenceStatus.set('offline');
        this.showNewMessageBanner.set(false);
        this.hasMoreMessages.set(true);

        if (id) {
          this.loadChatAndHistory(id);
          this.subscribeToRealtime(id);
          this.setupTypingDebounce(id);
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.cleanupRecordingResources();
    if (this.chatId()) {
      this.chatService.sendTypingStop(this.chatId());
      this.chatService.leaveChat(this.chatId());
    }
    this.chatChanged$.next();
    this.chatChanged$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  // ─────────────────────────────────────────────
  //  Initialization
  // ─────────────────────────────────────────────

  private async loadChatAndHistory(chatId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      // Load chat metadata
      const chats = await this.chatService.getMyChats().toPromise();
      if (this.chatId() !== chatId) return;

      const chat = chats?.find((c) => c._id === chatId);
      this.chat.set(chat ?? null);
      await this.loadMyRating(chatId);

      // Load initial message history (last 30)
      const msgs = await this.chatService.getMessages(chatId).toPromise();
      if (this.chatId() !== chatId) return;

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
      if (this.chatId() === chatId) {
        this.isLoading.set(false);
      }
    }
  }

  private subscribeToRealtime(chatId: string): void {
    const until$ = merge(this.destroy$, this.chatChanged$);

    // Incoming messages
    this.chatService.messages$.pipe(takeUntil(until$)).subscribe((msg) => {
      // Filter messages for this chat only
      if (msg.chat !== chatId) return;

      // Replace optimistic message if it matches localId
      const existing = this.messages().findIndex((m) => m.localId && m.localId === msg.localId);
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
    this.chatService.typing$.pipe(takeUntil(until$)).subscribe((userId) => this.typingUserId.set(userId));

    // Connection status
    this.chatService.connectionStatus$.pipe(takeUntil(until$)).subscribe((status) => this.connectionStatus.set(status));

    // Presence
    this.chatService.presence$.pipe(takeUntil(until$)).subscribe((status) => this.presenceStatus.set(status));

    this.chatService.chatUpdated$.pipe(takeUntil(until$)).subscribe((chat) => {
      if (chat._id !== chatId) return;
      this.chat.set(chat);
    });
  }

  private setupTypingDebounce(chatId: string): void {
    const until$ = merge(this.destroy$, this.chatChanged$);
    this.typingInput$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(until$)).subscribe((value) => {
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
        const updated = this.messages().map((m) =>
          m.localId === localId ? { ...ack.message!, status: 'sent' as const } : m
        );
        this.messages.set(updated);
      } else {
        // Mark as error for retry
        const updated = this.messages().map((m) => (m.localId === localId ? { ...m, status: 'error' as const } : m));
        this.messages.set(updated);
      }
    } catch {
      const updated = this.messages().map((m) => (m.localId === localId ? { ...m, status: 'error' as const } : m));
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

  private async loadMyRating(chatId: string): Promise<void> {
    try {
      const response = await this.chatService.getMyChatRating(chatId).toPromise();
      if (this.chatId() === chatId) {
        this.myRating.set(response?.rating ?? null);
      }
    } catch {
      this.myRating.set(null);
    }
  }

  async closeDeal(): Promise<void> {
    const id = this.chatId();
    if (!id || this.isClosingDeal() || this.hasConfirmedDeal()) return;

    this.isClosingDeal.set(true);
    try {
      const updated = await this.chatService.closeDeal(id).toPromise();
      if (updated) {
        this.chat.set(updated);
      }
    } catch (err) {
      console.error('[ChatRoom] Error closing deal:', err);
    } finally {
      this.isClosingDeal.set(false);
    }
  }

  setRating(score: number): void {
    this.ratingScore.set(score);
  }

  async submitRating(): Promise<void> {
    const score = this.ratingScore();
    if (!score || this.isSendingRating()) return;

    this.isSendingRating.set(true);
    try {
      const rating = await this.chatService.rateChat(this.chatId(), score, this.ratingComment().trim()).toPromise();
      if (rating) {
        this.myRating.set(rating);
      }
    } catch (err) {
      console.error('[ChatRoom] Error sending rating:', err);
    } finally {
      this.isSendingRating.set(false);
    }
  }

  async handlePostCloseGuidanceDecision(decision: 'ACCEPTED' | 'DISMISSED'): Promise<void> {
    const id = this.chatId();
    if (!id || this.isSavingGuidanceDecision()) return;

    this.isSavingGuidanceDecision.set(true);
    try {
      const updated = await this.chatService.setPostCloseGuidanceDecision(id, decision).toPromise();
      if (updated) {
        this.chat.set(updated);
      }

      if (decision === 'ACCEPTED') {
        await this.router.navigate(['/mentoring'], {
          queryParams: {
            route: 'BUY',
            contentKey: 'buy_m6_i1'
          }
        });
      }
    } catch (err) {
      console.error('[ChatRoom] Error saving post-close guidance decision:', err);
    } finally {
      this.isSavingGuidanceDecision.set(false);
    }
  }

  async retryMessage(msg: Mensaje): Promise<void> {
    if (!msg.localId) return;

    const updated = this.messages().map((m) => (m.localId === msg.localId ? { ...m, status: 'sending' as const } : m));
    this.messages.set(updated);

    try {
      let ack;
      if (msg.s3Key && msg.messageType) {
        ack = await this.chatService.sendMessage(this.chatId(), msg.content, {
          messageType: msg.messageType,
          s3Key: msg.s3Key,
          fileName: msg.fileName || '',
          fileSize: msg.fileSize || 0,
          mimeType: msg.mimeType || ''
        });
      } else {
        ack = await this.chatService.sendMessage(this.chatId(), msg.content);
      }

      if (ack.ok && ack.message) {
        const final = this.messages().map((m) =>
          m.localId === msg.localId ? { ...ack.message!, status: 'sent' as const } : m
        );
        this.messages.set(final);
      } else {
        const errored = this.messages().map((m) =>
          m.localId === msg.localId ? { ...m, status: 'error' as const } : m
        );
        this.messages.set(errored);
      }
    } catch {
      const errored = this.messages().map((m) => (m.localId === msg.localId ? { ...m, status: 'error' as const } : m));
      this.messages.set(errored);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      alert('El archivo supera el límite de 10 MB');
      return;
    }

    let messageType: MessageType = 'file';
    if (file.type.startsWith('image/')) {
      messageType = 'image';
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
    }

    this.isUploadingFile.set(true);

    try {
      // Step 1: Request S3 pre-signed upload URL (PUT)
      const res = await this.chatService.getPresignedChatUrl(file.name, file.type).toPromise();

      if (!res || !res.uploadUrl || !res.s3Key) {
        throw new Error('No se pudo obtener la URL de subida de S3');
      }

      const { uploadUrl, s3Key } = res;

      // Step 2: Upload binary file directly to S3
      await this.chatService.uploadFileToS3(uploadUrl, file).toPromise();

      // Step 3: Send message metadata via WebSockets
      await this.sendAttachmentMessage(messageType, s3Key, file.name, file.size, file.type);
    } catch (err) {
      console.error('[ChatRoom] Error subiendo archivo a S3:', err);
      alert('Error al subir el archivo');
    } finally {
      this.isUploadingFile.set(false);
      input.value = ''; // Reset input selection
    }
  }

  async sendAttachmentMessage(
    messageType: MessageType,
    s3Key: string,
    fileName: string,
    fileSize: number,
    mimeType: string
  ): Promise<void> {
    const chatId = this.chatId();
    const localId = `local_${Date.now()}`;
    const userId = this.currentUserId();

    const optimisticMsg: Mensaje = {
      localId,
      chat: chatId,
      sender: userId,
      content: '',
      messageType,
      s3Key,
      fileName,
      fileSize,
      mimeType,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    this.messages.set([...this.messages(), optimisticMsg]);
    this.shouldScrollToBottom = true;

    try {
      const ack = await this.chatService.sendMessage(chatId, '', {
        messageType,
        s3Key,
        fileName,
        fileSize,
        mimeType
      });

      if (ack.ok && ack.message) {
        const updated = this.messages().map((m) =>
          m.localId === localId ? { ...ack.message!, status: 'sent' as const } : m
        );
        this.messages.set(updated);
      } else {
        const updated = this.messages().map((m) => (m.localId === localId ? { ...m, status: 'error' as const } : m));
        this.messages.set(updated);
      }
    } catch {
      const updated = this.messages().map((m) => (m.localId === localId ? { ...m, status: 'error' as const } : m));
      this.messages.set(updated);
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
    setTimeout(() => {
      try {
        const el = this.messagesContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
        this.showNewMessageBanner.set(false);
      } catch {
        /* ignore */
      }
    }, 50);
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

  async startRecording(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Tu dispositivo o navegador no soporta el acceso al micrófono.');
      return;
    }

    if (!(window as any).MediaRecorder) {
      alert('Tu navegador no soporta la grabación de audio.');
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new (window as any).MediaRecorder(this.audioStream);

      this.mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        });

        this.isUploadingFile.set(true);

        try {
          const res = await this.chatService.getPresignedChatUrl(file.name, file.type).toPromise();
          if (!res || !res.uploadUrl || !res.s3Key) {
            throw new Error('No se pudo obtener la URL de S3');
          }
          const { uploadUrl, s3Key } = res;

          await this.chatService.uploadFileToS3(uploadUrl, file).toPromise();
          await this.sendAttachmentMessage('audio', s3Key, 'Nota de voz.webm', file.size, file.type);
        } catch (err) {
          console.error('[ChatRoom] Error enviando nota de voz:', err);
          alert('Error al enviar la nota de voz');
        } finally {
          this.isUploadingFile.set(false);
        }
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingDuration.set(0);

      this.recordingTimer = setInterval(() => {
        this.recordingDuration.set(this.recordingDuration() + 1);
      }, 1000);
    } catch (err) {
      console.error('[ChatRoom] Error al acceder al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor, concede los permisos correspondientes.');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanupRecordingResources();
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.cleanupRecordingResources();
  }

  private cleanupRecordingResources(): void {
    this.isRecording.set(false);
    this.recordingDuration.set(0);

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track: any) => track.stop());
      this.audioStream = null;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
