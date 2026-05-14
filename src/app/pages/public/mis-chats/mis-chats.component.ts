import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { Chat, Mensaje } from '../../../core/models/chat.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mis-chats',
  standalone: true,
  imports: [RouterLink, DatePipe, TranslateModule],
  templateUrl: './mis-chats.component.html',
  styleUrl: './mis-chats.component.css'
})
export class MisChatsComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  chats = signal<Chat[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');

  ngOnInit(): void {
    this.chatService.connect();
    this.loadChats();
    this.listenToNotifications();
  }

  private listenToNotifications(): void {
    this.chatService.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ chatId, message }) => {
      this.chats.update((list) => {
        const index = list.findIndex((c) => c._id === chatId);
        if (index === -1) return list;

        const updatedChat = { ...list[index] };

        // Actualitzar l'últim missatge
        updatedChat.lastMessage = {
          content: message.content,
          senderId: typeof message.sender === 'object' ? message.sender._id : message.sender,
          sentAt: message.createdAt
        };
        updatedChat.updatedAt = message.createdAt;

        // Incrementar comptador de no llegits (ja que la notificació és per al receptor)
        const isOwner = this.isOwnerOfOffer(updatedChat);
        if (isOwner) updatedChat.unreadOwner++;
        else updatedChat.unreadInterested++;

        const newList = [...list];
        newList[index] = updatedChat;

        // Re-ordenar perquè el més recent surti a dalt
        return newList.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
      });
    });
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

  isOwnerOfOffer(chat: Chat): boolean {
    const userId = this.currentUserId();
    const ownerId = typeof chat.owner === 'object' ? chat.owner._id : chat.owner;
    return ownerId === userId;
  }

  updateChatStatus(event: Event, chat: Chat, status: 'APPROVED' | 'REJECTED'): void {
    event.preventDefault();
    event.stopPropagation();

    this.chatService.updateChatStatus(chat._id, status).subscribe({
      next: (updated) => {
        this.chats.update((list) => list.map((c) => (c._id === chat._id ? updated : c)));
      },
      error: (err) => console.error('Error updating chat status:', err)
    });
  }
}
