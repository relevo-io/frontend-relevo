import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MonetizationService } from '../../../core/services/monetization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Oferta } from '../../../core/models/oferta.model';
import { PaymentService } from '../../../core/services/payment.service';

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
  private paymentService = inject(PaymentService);
  private monetizationService = inject(MonetizationService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);

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

    this.startStripeCheckout();
  }

  private startStripeCheckout(): void {
    this.isProcessing.set(true);

    const draft = this.draft();
    if (this.mode() === 'publish-offer' && !draft) {
      this.isProcessing.set(false);
      this.router.navigate(['/ofertas/crear']);
      return;
    }

    this.paymentService
      .createCheckoutSession(
        this.mode() === 'publish-offer'
          ? { kind: 'offer_publication', offerDraft: draft ?? undefined }
          : { kind: 'pro_activation' }
      )
      .subscribe({
        next: ({ checkoutUrl }) => {
          window.location.href = checkoutUrl;
        },
        error: () => {
          this.isProcessing.set(false);
          this.notifications.error(this.translate.instant('MONETIZATION.CHECKOUT_ERROR'));
        }
      });
  }
}
