import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, timer } from 'rxjs';
import { catchError, switchMap, takeWhile } from 'rxjs/operators';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { MonetizationService } from '../../../core/services/monetization.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CheckoutSessionStatus } from '../../../core/models/payment.model';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.css'
})
export class PaymentResultComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private monetizationService = inject(MonetizationService);
  private notifications = inject(NotificationService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  paymentSessionId = this.route.snapshot.queryParamMap.get('paymentSessionId') ?? '';
  canceled = this.route.snapshot.queryParamMap.get('canceled') === '1';

  isLoading = signal(false);
  isPending = signal(false);
  status = signal<CheckoutSessionStatus | null>(null);

  constructor() {
    if (!this.paymentSessionId) {
      this.router.navigate(['/']);
      return;
    }

    if (!this.canceled) {
      this.pollStatus();
    }
  }

  retry(): void {
    this.pollStatus();
  }

  private pollStatus(): void {
    this.isLoading.set(true);
    this.isPending.set(true);

    timer(0, 2000)
      .pipe(
        takeWhile((attempt) => attempt < 8, true),
        switchMap(() => this.paymentService.getCheckoutSessionStatus(this.paymentSessionId)),
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.isLoading.set(false);
          this.isPending.set(false);
          this.notifications.error(this.translate.instant('MONETIZATION.RESULT_STATUS_ERROR'));
          return EMPTY;
        })
      )
      .subscribe((result) => {
        this.status.set(result);

        if (result.status === 'completed') {
          this.isLoading.set(false);
          this.isPending.set(false);
          this.handleCompleted(result);
          return;
        }

        if (result.status === 'failed' || result.status === 'canceled') {
          this.isLoading.set(false);
          this.isPending.set(false);
          return;
        }
      });
  }

  private handleCompleted(result: CheckoutSessionStatus): void {
    if (result.kind === 'offer_publication') {
      this.monetizationService.clearPendingOfferDraft();
      this.notifications.success(this.translate.instant('COMMON.NOTIF.OFFER_CREATED_SUCCESS'));
      if (result.createdOfferId) {
        this.router.navigate(['/ofertas', result.createdOfferId]);
        return;
      }

      this.router.navigate(['/mis-ofertas']);
      return;
    }

    this.authService.fetchProfile().subscribe({
      next: () => {
        this.notifications.success(this.translate.instant('MONETIZATION.PRO_ACTIVATED_SUCCESS'));
        this.router.navigate(['/perfil']);
      },
      error: () => {
        this.router.navigate(['/perfil']);
      }
    });
  }
}
