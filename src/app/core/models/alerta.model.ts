import { Oferta } from './oferta.model';

export interface AlertaMatchedOffer {
  offerId: string | Oferta;
  matchedAt: string;
}

export interface AlertaOferta {
  _id?: string;
  userId?: string;
  name?: string;
  revenueRange?: string;
  employeeRange?: string;
  region?: string;
  isActive: boolean;
  matchedOffers?: AlertaMatchedOffer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAlertaOfertaRequest {
  name?: string;
  revenueRange?: string;
  employeeRange?: string;
  region?: string;
}
