import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Chat, Mensaje } from '../../../core/models/chat.model';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';

@Component({
  selector: 'app-admin-chats',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './admin-chats.component.html',
  styleUrl: './admin-chats.component.css'
})
export class AdminChatsComponent implements OnInit {
  private chatService = inject(ChatService);
  private toast = inject(NotificationService);

  chats = signal<Chat[]>([]);
  selectedChat = signal<Chat | null>(null);
  messages = signal<Mensaje[]>([]);

  isLoading = signal(true);
  isRefreshing = signal(false);
  isLoadingMessages = signal(false);
  error = signal<string | null>(null);
  messageError = signal<string | null>(null);

  searchQuery = signal('');
  statusFilter = signal<'ALL' | Chat['status']>('ALL');

  filteredChats = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.chats().filter((chat) => {
      const owner = this.userLabel(chat.owner);
      const interested = this.userLabel(chat.interested);
      const offer = this.offerLabel(chat);
      const matchesStatus = status === 'ALL' || chat.status === status;
      const matchesQuery = !query || `${owner} ${interested} ${offer}`.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.fetchChats();
  }

  fetchChats(): void {
    this.error.set(null);
    this.isLoading.set(!this.isRefreshing());

    this.chatService.getAllChatsAdmin().subscribe({
      next: (chats) => {
        this.chats.set(chats);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Error loading admin chats', err);
        this.error.set('No existe todavia un listado operativo de chats para administracion.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  refresh(): void {
    this.isRefreshing.set(true);
    this.fetchChats();
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'ALL' | Chat['status']);
  }

  viewMessages(chat: Chat): void {
    this.selectedChat.set(chat);
    this.messages.set([]);
    this.messageError.set(null);
    this.isLoadingMessages.set(true);

    this.chatService.getMessages(chat._id, undefined, 50).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.isLoadingMessages.set(false);
      },
      error: (err) => {
        console.error('Error loading admin chat messages', err);
        this.messageError.set('No se pudieron cargar los mensajes de este chat.');
        this.isLoadingMessages.set(false);
      }
    });
  }

  setReadOnly(chat: Chat): void {
    if (chat.isReadOnly) return;

    this.chatService.setChatReadOnly(chat._id).subscribe({
      next: () => {
        this.chats.update((current) =>
          current.map((item) => (item._id === chat._id ? { ...item, isReadOnly: true } : item))
        );
        if (this.selectedChat()?._id === chat._id) {
          this.selectedChat.set({ ...chat, isReadOnly: true });
        }
        this.toast.success('Chat puesto en solo lectura');
      },
      error: (err) => {
        console.error('Error setting chat readonly', err);
        this.toast.error('No se pudo marcar el chat como solo lectura');
      }
    });
  }

  userLabel(user: Chat['owner'] | Chat['interested']): string {
    if (typeof user === 'string') return user;
    return user.fullName || user.email || user._id;
  }

  userEmail(user: Chat['owner'] | Chat['interested']): string {
    if (typeof user === 'string') return '';
    return user.email || '';
  }

  offerLabel(chat: Chat): string {
    if (typeof chat.oferta === 'string') return chat.oferta;
    return chat.oferta.companyDescription || chat.oferta._id;
  }

  offerMeta(chat: Chat): string {
    if (typeof chat.oferta === 'string') return '';
    return [chat.oferta.sector, chat.oferta.region].filter(Boolean).join(' - ');
  }

  statusClass(status: Chat['status']): string {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return 'warning';
  }
}
