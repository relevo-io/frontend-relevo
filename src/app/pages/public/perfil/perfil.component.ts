import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MyRatingsResponse, UserRating, Usuario } from '../../../core/models/usuario.model';
import { TranslateModule } from '@ngx-translate/core';
import { Chat } from '../../../core/models/chat.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, DatePipe, TranslateModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  public authService = inject(AuthService);
  private chatService = inject(ChatService);
  private fb = inject(FormBuilder);

  usuario = signal<Usuario | null>(null);
  recentChats = signal<Chat[]>([]);
  ratings = signal<MyRatingsResponse | null>(null);
  isEditing = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);

  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');

  profileForm: FormGroup = this.fb.group({
    location: [''],
    bio: [''],
    professionalBackground: ['']
  });

  ngOnInit() {
    this.cargarMiPerfil();
    this.cargarChatsRecientes();
    this.cargarRatings();
  }

  cargarMiPerfil() {
    const cachedUser = this.authService.currentUser();
    if (!cachedUser?._id) return;

    this.usuarioService.getUsuario(cachedUser._id).subscribe({
      next: (data) => {
        this.usuario.set(data);
        this.profileForm.patchValue({
          location: data.location || '',
          bio: data.bio || '',
          professionalBackground: data.professionalBackground || ''
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleEdit() {
    this.isEditing.update((v) => !v);
  }

  guardarPerfil() {
    const current = this.usuario();
    if (!current?._id) return;

    this.isSaving.set(true);
    const formVals = this.profileForm.value;

    this.usuarioService.updateUsuario(current._id, formVals).subscribe({
      next: (actualizado) => {
        this.usuario.set(actualizado);
        this.isEditing.set(false);
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
      }
    });
  }

  cargarChatsRecientes(): void {
    this.chatService.getMyChats().subscribe({
      next: (chats) => this.recentChats.set(chats.slice(0, 5)),
      error: () => {
        /* silencioso */
      }
    });
  }

  cargarRatings(): void {
    this.usuarioService.getMyRatings().subscribe({
      next: (data) => this.ratings.set(data),
      error: () => this.ratings.set(null)
    });
  }

  getReviewerName(rating: UserRating): string {
    const fromUser = rating.fromUser;
    if (typeof fromUser === 'object' && fromUser?.fullName) return fromUser.fullName;
    return 'Usuario';
  }

  getOtherParticipantName(chat: Chat): string {
    const userId = this.currentUserId();
    const owner = chat.owner as { _id: string; fullName: string } | string;
    const interested = chat.interested as { _id: string; fullName: string } | string;
    if (typeof owner === 'object' && owner._id !== userId) return owner.fullName;
    if (typeof interested === 'object' && interested._id !== userId) return interested.fullName;
    return 'Usuario';
  }

  getUnreadCount(chat: Chat): number {
    const userId = this.currentUserId();
    const owner = chat.owner as { _id: string } | string;
    const isOwner = typeof owner === 'object' ? owner._id === userId : owner === userId;
    return isOwner ? chat.unreadOwner : chat.unreadInterested;
  }

  getTotalUnread(): number {
    return this.recentChats().reduce((sum, c) => sum + this.getUnreadCount(c), 0);
  }
}
