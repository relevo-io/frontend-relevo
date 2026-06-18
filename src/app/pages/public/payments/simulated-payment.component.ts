import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OfertaService } from '../../../core/services/oferta.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { MonetizationService } from '../../../core/services/monetization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Oferta } from '../../../core/models/oferta.model';

@Component({
  selector: 'app-simulated-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './simulated-payment.component.html',
  styleUrl: './simulated-payment.component.css'
})
export class SimulatedPaymentComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ofertaService = inject(OfertaService);
  private usuarioService = inject(UsuarioService);
  private monetizationService = inject(MonetizationService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private authService = inject(AuthService);

  mode = signal<'publish-offer' | 'pro'>('pro');
  isProcessing = signal(false);
  draft = signal<Partial<Oferta> | null>(null);

  title = computed(() =>
    this.mode() === 'publish-offer' ? 'MONETIZATION.PUBLISH_PAYMENT_TITLE' : 'MONETIZATION.PRO_PAYMENT_TITLE'
  );

  subtitle = computed(() =>
    this.mode() === 'publish-offer' ? 'MONETIZATION.PUBLISH_PAYMENT_SUBTITLE' : 'MONETIZATION.PRO_PAYMENT_SUBTITLE'
  );

  primaryLabel = computed(() =>
    this.mode() === 'publish-offer' ? 'MONETIZATION.PAY_AND_PUBLISH' : 'MONETIZATION.ACTIVATE_PRO'
  );

  constructor() {
    const mode = this.route.snapshot.paramMap.get('mode');
    this.mode.set(mode === 'publish-offer' ? 'publish-offer' : 'pro');
    this.draft.set(this.monetizationService.getPendingOfferDraft());
  }

  submit(): void {
    if (this.isProcessing()) {
      return;
    }

    if (this.mode() === 'publish-offer') {
      this.completeOfferPublication();
      return;
    }

    this.activateProPlan();
  }

  private completeOfferPublication(): void {
    const draft = this.draft();
    if (!draft) {
      this.router.navigate(['/ofertas/crear']);
      return;
    }

    this.isProcessing.set(true);
    this.ofertaService.purchasePublicationCredit().subscribe({
      next: () => {
        this.ofertaService.createOferta(draft).subscribe({
          next: (oferta) => {
            this.monetizationService.clearPendingOfferDraft();
            this.isProcessing.set(false);
            this.notifications.success(this.translate.instant('COMMON.NOTIF.OFFER_CREATED_SUCCESS'));
            if (oferta._id) {
              this.router.navigate(['/ofertas', oferta._id]);
              return;
            }
            this.router.navigate(['/mis-ofertas']);
          },
          error: () => {
            this.isProcessing.set(false);
          }
        });
      },
      error: () => {
        this.isProcessing.set(false);
      }
    });
  }

  private activateProPlan(): void {
    this.isProcessing.set(true);
    this.usuarioService.activateProPlan().subscribe({
      next: () => {
        this.authService.fetchProfile().subscribe({
          next: () => {
            this.isProcessing.set(false);
            this.notifications.success(this.translate.instant('MONETIZATION.PRO_ACTIVATED_SUCCESS'));
            this.router.navigate(['/perfil']);
          },
          error: () => {
            this.isProcessing.set(false);
            this.router.navigate(['/perfil']);
          }
        });
      },
      error: () => {
        this.isProcessing.set(false);
      }
    });
  }
}
