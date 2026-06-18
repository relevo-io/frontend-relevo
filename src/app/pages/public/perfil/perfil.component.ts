import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { MyRatingsResponse, UserRating, Usuario } from '../../../core/models/usuario.model';
import { TranslateModule } from '@ngx-translate/core';
import { Chat } from '../../../core/models/chat.model';
import {
  MARKETPLACE_EMPLOYEE_RANGE_OPTIONS,
  MARKETPLACE_REVENUE_RANGE_OPTIONS,
  MARKETPLACE_SECTOR_OPTIONS
} from '../../../shared/utils/marketplace-options';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';

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
  selectedPreferredSectors = signal<string[]>([]);
  selectedPreferredEmployeeRanges = signal<string[]>([]);
  selectedPreferredRevenueRanges = signal<string[]>([]);

  sectorOptions = MARKETPLACE_SECTOR_OPTIONS;
  employeeRangeOptions = MARKETPLACE_EMPLOYEE_RANGE_OPTIONS;
  revenueRangeOptions = MARKETPLACE_REVENUE_RANGE_OPTIONS;

  currentUserId = computed(() => this.authService.currentUser()?._id ?? '');
  isProUser = computed(() => this.authService.isPro());

  profileForm: FormGroup = this.fb.group({
    location: [''],
    bio: [''],
    professionalBackground: [''],
    preferredRegionsText: [''],
    preferredCreationYearFrom: [null],
    preferredCreationYearTo: [null]
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
          professionalBackground: data.professionalBackground || '',
          preferredRegionsText: (data.preferredRegions || []).join(', '),
          preferredCreationYearFrom: data.preferredCreationYearFrom ?? null,
          preferredCreationYearTo: data.preferredCreationYearTo ?? null
        });
        this.selectedPreferredSectors.set(data.preferredSectors ?? []);
        this.selectedPreferredEmployeeRanges.set(data.preferredEmployeeRanges ?? []);
        this.selectedPreferredRevenueRanges.set(data.preferredRevenueRanges ?? []);
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

    const preferredRegions = String(formVals.preferredRegionsText || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    this.usuarioService
      .updateUsuario(current._id, {
        location: formVals.location || '',
        bio: formVals.bio || '',
        professionalBackground: formVals.professionalBackground || ''
      })
      .subscribe({
        next: () => {
          this.usuarioService
            .updateMarketplacePreferences({
              preferredRegions,
              preferredSectors: this.selectedPreferredSectors(),
              preferredEmployeeRanges: this.selectedPreferredEmployeeRanges(),
              preferredRevenueRanges: this.selectedPreferredRevenueRanges(),
              preferredCreationYearFrom: formVals.preferredCreationYearFrom || undefined,
              preferredCreationYearTo: formVals.preferredCreationYearTo || undefined
            })
            .subscribe({
              next: (actualizado) => {
                this.usuario.set(actualizado);
                this.authService.currentUser.set(actualizado);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('user_data', JSON.stringify(actualizado));
                }
                this.isEditing.set(false);
                this.isSaving.set(false);
              },
              error: (err) => {
                console.error(err);
                this.isSaving.set(false);
              }
            });
        },
        error: (err) => {
          console.error(err);
          this.isSaving.set(false);
        }
      });
  }

  togglePreferenceValue(
    signalRef:
      | typeof this.selectedPreferredSectors
      | typeof this.selectedPreferredEmployeeRanges
      | typeof this.selectedPreferredRevenueRanges,
    value: string
  ): void {
    signalRef.update((items) => (items.includes(value) ? items.filter((item) => item !== value) : [...items, value]));
  }

  hasPreferenceValue(
    signalRef:
      | typeof this.selectedPreferredSectors
      | typeof this.selectedPreferredEmployeeRanges
      | typeof this.selectedPreferredRevenueRanges,
    value: string
  ): boolean {
    return signalRef().includes(value);
  }

  formatEmployee(value: string): string {
    return formatEmployeeRange(value);
  }

  formatRevenue(value: string): string {
    return formatRevenueRange(value);
  }

  getPreferencesSummary(user: Usuario): string {
    const parts = [
      (user.preferredSectors ?? []).join(', '),
      (user.preferredRegions ?? []).join(', '),
      (user.preferredEmployeeRanges ?? []).map((value) => this.formatEmployee(value)).join(', '),
      (user.preferredRevenueRanges ?? []).map((value) => this.formatRevenue(value)).join(', '),
      user.preferredCreationYearFrom && user.preferredCreationYearTo
        ? `${user.preferredCreationYearFrom} - ${user.preferredCreationYearTo}`
        : ''
    ].filter(Boolean);

    return parts.join(' · ');
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
