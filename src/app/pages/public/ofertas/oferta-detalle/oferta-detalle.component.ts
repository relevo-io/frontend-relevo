import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OfertaService } from '../../../../core/services/oferta.service';
import { Oferta } from '../../../../core/models/oferta.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../../shared/utils/oferta-formatters';
import { SolicitudService } from '../../../../core/services/solicitud.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatService } from '../../../../core/services/chat.service';

@Component({
  selector: 'app-oferta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: './oferta-detalle.component.html',
  styleUrl: './oferta-detalle.component.css',
})
export class OfertaDetalle {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ofertaService = inject(OfertaService);
  private solicitudService = inject(SolicitudService);
  private usuarioService = inject(UsuarioService);
  private ns = inject(NotificationService);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  oferta = signal<Oferta | null>(null);
  isLoading = signal<boolean>(true);
  isSending = signal<boolean>(false);
  isStartingChat = signal<boolean>(false);
  showRequestForm = signal<boolean>(false);
  error = signal<string | null>(null);

  requestForm = this.fb.group({
    professionalBackground: ['', [Validators.required, Validators.minLength(10)]],
    preferredRegionsText: ['', [Validators.required, Validators.minLength(2)]],
    bio: ['', [Validators.required, Validators.minLength(10)]],
    cv: ['', [Validators.required, Validators.minLength(10)]],
  });

  isOwnOffer = computed(() => {
    const offer = this.oferta();
    const currentUserId = this.authService.currentUser()?._id;
    if (!offer || !currentUserId) return false;

    const ownerId = this.extractOwnerId(offer.owner);
    return ownerId === currentUserId;
  });

  /** Visible si: logueado + no es su propia oferta */
  canChat = computed(() => {
    return this.authService.isLoggedIn() && !this.isOwnOffer();
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set(this.translate.instant('OFFER_DETAIL.NOT_FOUND_ERROR') || 'No se encontró el identificador de la oferta.');
        this.isLoading.set(false);
        return;
      }

      this.cargarOferta(id);
    });
  }

  cargarOferta(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.ofertaService.getOfertaById(id).subscribe({
      next: (data) => {
        this.oferta.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando detalle de oferta:', err);
        this.error.set(this.translate.instant('OFFER_DETAIL.LOADING_ERROR') || 'No se pudo cargar la oferta.');
        this.isLoading.set(false);
      },
    });
  }

  abrirFormularioSolicitud(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.isOwnOffer()) {
      this.ns.info(this.translate.instant('OFFER_DETAIL.OWN_OFFER_NOTICE'));
      return;
    }

    const current = this.authService.currentUser();
    this.requestForm.patchValue({
      professionalBackground: current?.professionalBackground ?? '',
      preferredRegionsText: (current?.preferredRegions ?? []).join(', '),
      bio: current?.bio ?? '',
      cv: current?.cv ?? '',
    });

    this.showRequestForm.set(true);
  }

  cerrarFormularioSolicitud(): void {
    this.showRequestForm.set(false);
  }

  enviarSolicitud(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const currentUser = this.authService.currentUser();
    const offer = this.oferta();

    if (!currentUser?._id || !offer?._id) {
      this.ns.error(this.translate.instant('COMMON.NOTIF.IDENTIFY_ERROR'));
      return;
    }

    this.isSending.set(true);

    const formValue = this.requestForm.getRawValue();
    const preferredRegions = (formValue.preferredRegionsText ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => !!v);

    this.usuarioService
      .updateUsuario(currentUser._id, {
        professionalBackground: formValue.professionalBackground?.trim(),
        preferredRegions,
        bio: formValue.bio?.trim(),
        cv: formValue.cv?.trim(),
      })
      .subscribe({
        next: () => {
          this.solicitudService
            .crearSolicitud({
              opportunityId: offer._id!,
              message: `Solicitud enviada por ${currentUser.fullName}.`,
            })
            .subscribe({
              next: () => {
                this.isSending.set(false);
                this.showRequestForm.set(false);
                this.authService.fetchProfile().subscribe();
                this.ns.success(this.translate.instant('COMMON.NOTIF.REQUEST_SENT_SUCCESS'));
              },
              error: (err) => {
                console.error('Error creando solicitud:', err);
                this.isSending.set(false);
                this.ns.error(this.translate.instant('COMMON.NOTIF.REQUEST_SENT_ERROR'));
              },
            });
        },
        error: (err) => {
          console.error('Error actualizando perfil previo a solicitud:', err);
          this.isSending.set(false);
          const detail = err?.error?.details?.[0]?.message;
          this.ns.error(detail ? `${this.translate.instant('COMMON.NOTIF.PROFILE_UPDATE_ERROR')}: ${detail}` : this.translate.instant('COMMON.NOTIF.PROFILE_UPDATE_ERROR'));
        },
      });
  }

  formatRevenue(value?: string): string {
    return formatRevenueRange(value);
  }

  formatEmployees(value?: string): string {
    return formatEmployeeRange(value);
  }

  async contactarOwner(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const ofertaId = this.oferta()?._id;
    if (!ofertaId) return;

    this.isStartingChat.set(true);
    try {
      const chat = await this.chatService.getOrCreateChat(ofertaId).toPromise();
      if (chat?._id) {
        this.router.navigate(['/chats', chat._id]);
      }
    } catch (err) {
      this.ns.error('No se pudo iniciar el chat. Inténtalo de nuevo.');
    } finally {
      this.isStartingChat.set(false);
    }
  }

  private extractOwnerId(owner: unknown): string | null {
    if (!owner) return null;
    if (typeof owner === 'string') return owner;
    if (typeof owner === 'object' && owner !== null && '_id' in owner) {
      const maybeId = (owner as { _id?: unknown })._id;
      return typeof maybeId === 'string' ? maybeId : null;
    }
    return null;
  }
}
