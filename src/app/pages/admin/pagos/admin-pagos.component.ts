import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { CheckoutSessionStatus } from '../../../core/models/payment.model';

@Component({
  selector: 'app-admin-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pagos.component.html',
  styleUrl: './admin-pagos.component.css'
})
export class AdminPagosComponent {
  private paymentService = inject(PaymentService);

  paymentSessionId = '';
  result = signal<CheckoutSessionStatus | null>(null);
  searchedId = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  search(): void {
    const sessionId = this.paymentSessionId.trim();
    this.searchedId.set(sessionId || null);
    this.result.set(null);
    this.error.set(null);

    if (!sessionId) {
      return;
    }

    this.isLoading.set(true);
    this.paymentService.getCheckoutSessionStatus(sessionId).subscribe({
      next: (result) => {
        this.result.set(result);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error checking payment session status', err);
        this.error.set('No se ha encontrado ninguna sesion con ese identificador o no esta accesible para el admin.');
        this.isLoading.set(false);
      }
    });
  }

  statusClass(status: CheckoutSessionStatus['status']): string {
    if (status === 'completed') return 'success';
    if (status === 'pending' || status === 'processing') return 'warning';
    if (status === 'failed' || status === 'canceled') return 'danger';
    return 'neutral';
  }

  kindLabel(kind: CheckoutSessionStatus['kind']): string {
    return kind === 'pro_activation' ? 'Activacion PRO' : 'Publicacion de oferta';
  }
}
