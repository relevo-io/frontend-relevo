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
  styleUrl: './oferta-detalle.component.css'
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
  solicitudStatus = signal<string | null>(null);

  requestForm = this.fb.group({
    professionalBackground: ['', [Validators.required, Validators.minLength(10)]],
    preferredRegionsText: ['', [Validators.required, Validators.minLength(2)]],
    bio: ['', [Validators.required, Validators.minLength(10)]]
  });

  selectedCvFile = signal<File | null>(null);
  isUploadingCv = signal<boolean>(false);
  cvUploadError = signal<string | null>(null);

  isOwnOffer = computed(() => {
    const offer = this.oferta();
    const currentUserId = this.authService.currentUser()?._id;
    if (!offer || !currentUserId) return false;

    const ownerId = this.extractOwnerId(offer.owner);
    return ownerId === currentUserId;
  });

  /** Visible si: logueado + no es su propia oferta (ahora permitimos contactar sin solicitud previa) */
  canChat = computed(() => {
    return this.authService.isLoggedIn() && !this.isOwnOffer();
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set(
          this.translate.instant('OFFER_DETAIL.NOT_FOUND_ERROR') || 'No se encontró el identificador de la oferta.'
        );
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
        this.verificarEstadoSolicitud(id);
      },
      error: (err) => {
        console.error('Error cargando detalle de oferta:', err);
        this.error.set(this.translate.instant('OFFER_DETAIL.LOADING_ERROR') || 'No se pudo cargar la oferta.');
        this.isLoading.set(false);
      }
    });
  }

  verificarEstadoSolicitud(ofertaId: string): void {
    if (!this.authService.isLoggedIn()) return;

    this.solicitudService.getMiSolicitudParaOferta(ofertaId).subscribe({
      next: (sol) => {
        if (sol) {
          this.solicitudStatus.set(sol.status);
        }
      },
      error: (err) => console.error('Error verificando estado solicitud:', err)
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
      bio: current?.bio ?? ''
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

    if (!this.selectedCvFile()) {
      this.cvUploadError.set('Debes adjuntar tu CV en formato PDF.');
      return;
    }

    const currentUser = this.authService.currentUser();
    const offer = this.oferta();

    if (!currentUser?._id || !offer?._id) {
      this.ns.error(this.translate.instant('COMMON.NOTIF.IDENTIFY_ERROR'));
      return;
    }

    this.isSending.set(true);
    this.cvUploadError.set(null);

    const formValue = this.requestForm.getRawValue();
    const preferredRegions = (formValue.preferredRegionsText ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => !!v);

    // Step 1: Update profile data
    this.usuarioService
      .updateUsuario(currentUser._id, {
        professionalBackground: formValue.professionalBackground?.trim(),
        preferredRegions,
        bio: formValue.bio?.trim()
      })
      .subscribe({
        next: () => {
          // Step 2: Create the solicitud first
          this.solicitudService
            .crearSolicitud({
              opportunityId: offer._id!,
              message: `Solicitud enviada por ${currentUser.fullName}.`
            })
            .subscribe({
              next: (solicitud) => {
                // Step 3: Get a pre-signed PUT URL from our backend
                const file = this.selectedCvFile()!;
                this.isUploadingCv.set(true);
                this.solicitudService.getPresignedUploadUrl(file.name).subscribe({
                  next: ({ uploadUrl, s3Key }) => {
                    // Step 4: PUT the file directly to S3
                    this.solicitudService.uploadCvToS3(uploadUrl, file).subscribe({
                      next: () => {
                        // Step 5: Notify Node to persist the s3Key in the Solicitud
                        this.solicitudService.guardarCvKey(solicitud._id, s3Key).subscribe({
                          next: () => {
                            this.isSending.set(false);
                            this.isUploadingCv.set(false);
                            this.showRequestForm.set(false);
                            this.solicitudStatus.set(solicitud.status);
                            this.authService.fetchProfile().subscribe();
                            this.ns.success(this.translate.instant('COMMON.NOTIF.REQUEST_SENT_SUCCESS'));
                          },
                          error: (err) => {
                            console.error('Error guardando cvKey:', err);
                            this.isSending.set(false);
                            this.isUploadingCv.set(false);
                            // Solicitud creada aunque el key no se guardó — informamos
                            this.ns.error('CV subido, pero hubo un error al vincular la solicitud.');
                          }
                        });
                      },
                      error: (err) => {
                        console.error('Error subiendo CV a S3:', err);
                        this.isSending.set(false);
                        this.isUploadingCv.set(false);
                        this.cvUploadError.set('No se pudo subir el CV. Inténtalo de nuevo.');
                      }
                    });
                  },
                  error: (err) => {
                    console.error('Error generando presigned URL:', err);
                    this.isSending.set(false);
                    this.isUploadingCv.set(false);
                    this.cvUploadError.set('Error al preparar la subida. Inténtalo de nuevo.');
                  }
                });
              },
              error: (err) => {
                console.error('Error creando solicitud:', err);
                this.isSending.set(false);
              }
            });
        },
        error: (err) => {
          console.error('Error actualizando perfil previo a solicitud:', err);
          this.isSending.set(false);
        }
      });
  }

  onCvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.cvUploadError.set(null);

    if (!file) {
      this.selectedCvFile.set(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      this.cvUploadError.set('Solo se admiten archivos PDF.');
      this.selectedCvFile.set(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5 MB max
      this.cvUploadError.set('El archivo no puede superar los 5 MB.');
      this.selectedCvFile.set(null);
      return;
    }

    this.selectedCvFile.set(file);
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
      this.ns.error(this.translate.instant('COMMON.NOTIF.CHAT_ERROR'));
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
