import { Oferta } from './oferta.model';

export type PaymentKind = 'offer_publication' | 'pro_activation';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface CreateCheckoutSessionPayload {
  kind: PaymentKind;
  offerDraft?: Partial<Oferta>;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  paymentSessionId: string;
}

export interface CheckoutSessionStatus {
  status: PaymentStatus;
  kind: PaymentKind;
  createdOfferId?: string;
  proActive?: boolean;
  proExpiresAt?: string | null;
}
