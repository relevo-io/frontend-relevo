import { RatingSummary } from './usuario.model';

export interface Oferta {
  _id?: string;
  region: string;
  sector: string;
  revenueRange?: string;
  owner?: string | { _id?: string; fullName?: string; email?: string };
  creationYear?: number;
  employeeRange?: string;
  companyDescription: string;
  extendedDescription?: string;
  detailViewCount: number;
  favoriteCount: number;
  ownerRating?: RatingSummary;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfertaAnalytics {
  detailViewCount: number;
  favoriteCount: number;
  requestCount: number;
  requestConversionRate: number;
  requestsByStatus: {
    pending: number;
    accepted: number;
    rejected: number;
  };
}

export interface OwnerAnalyticsSummary {
  publishedOffers: number;
  totalViews: number;
  totalFavorites: number;
  totalRequests: number;
  averageConversionRate: number;
}
