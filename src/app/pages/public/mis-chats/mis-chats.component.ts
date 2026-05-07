import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { Chat } from '../../../core/models/chat.model';

@Component({
  selector: 'app-mis-chats',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './mis-chats.component.html',
  styleUrl: './mis-chats.component.css'
})
export class MisChatsComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  chats = signal<Chat[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.chatService.getMyChats().subscribe({
      next: (chats) => {
        this.chats.set(chats);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las conversaciones');
        this.isLoading.set(false);
      }
    });
  }

  getOtherParticipantName(chat: Chat): string {
    const userId = this.currentUserId();
    const owner = chat.owner as { _id: string; fullName: string } | string;
    const interested = chat.interested as { _id: string; fullName: string } | string;

    if (typeof owner === 'object' && owner._id !== userId) return owner.fullName;
    if (typeof interested === 'object' && interested._id !== userId) return interested.fullName;
    return 'Usuario';
  }

  getOtherParticipantInitial(chat: Chat): string {
    return this.getOtherParticipantName(chat).charAt(0).toUpperCase();
  }

  getOfertaInfo(chat: Chat): { sector: string; region: string } | null {
    if (typeof chat.oferta === 'string') return null;
    const o = chat.oferta as { sector: string; region: string };
    return { sector: o.sector, region: o.region };
  }

  getUnreadCount(chat: Chat): number {
    const userId = this.currentUserId();
    const owner = chat.owner as { _id: string } | string;
    const isOwner = typeof owner === 'object' ? owner._id === userId : owner === userId;
    return isOwner ? chat.unreadOwner : chat.unreadInterested;
  }

  getTotalUnread(): number {
    return this.chats().reduce((sum, c) => sum + this.getUnreadCount(c), 0);
  }

  getLastMessagePreview(chat: Chat): string {
    if (!chat.lastMessage) return 'Sin mensajes aún';
    const preview = chat.lastMessage.content;
    return preview.length > 60 ? preview.slice(0, 60) + '...' : preview;
  }

  isLastMessageMine(chat: Chat): boolean {
    if (!chat.lastMessage) return false;
    return chat.lastMessage.senderId === this.currentUserId();
  }
}
