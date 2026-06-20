import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutSessionResponse, CheckoutSessionStatus, CreateCheckoutSessionPayload } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/payments`;

  createCheckoutSession(payload: CreateCheckoutSessionPayload): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.apiUrl}/checkout-session`, payload);
  }

  getCheckoutSessionStatus(paymentSessionId: string): Observable<CheckoutSessionStatus> {
    return this.http.get<CheckoutSessionStatus>(`${this.apiUrl}/checkout-session/${paymentSessionId}/status`);
  }
}
