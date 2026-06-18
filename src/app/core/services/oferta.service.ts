import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Oferta, OfertaAnalytics, OwnerAnalyticsSummary } from '../models/oferta.model';
import { PaginatedResponse } from '../models/pagination.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/api/ofertas`;

  getOfertas(excludeOwnerId?: string): Observable<Oferta[]> {
    if (excludeOwnerId) {
      return this.http.get<Oferta[]>(`${this.apiUrl}?excludeOwnerId=${excludeOwnerId}`);
    }
    return this.http.get<Oferta[]>(this.apiUrl);
  }

  getOfertasPaged(
    page: number,
    limit: number,
    excludeOwnerId?: string,
    search?: string,
    filters?: {
      sector?: string;
      region?: string;
      employeeRange?: string;
      revenueRange?: string;
      creationYearFrom?: number | null;
      creationYearTo?: number | null;
    }
  ): Observable<PaginatedResponse<Oferta>> {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });

    if (excludeOwnerId) {
      query.set('excludeOwnerId', excludeOwnerId);
    }
    if (search?.trim()) {
      query.set('search', search.trim());
    }
    if (filters?.sector?.trim()) {
      query.set('sector', filters.sector.trim());
    }
    if (filters?.region?.trim()) {
      query.set('region', filters.region.trim());
    }
    if (filters?.employeeRange) {
      query.set('employeeRange', filters.employeeRange);
    }
    if (filters?.revenueRange) {
      query.set('revenueRange', filters.revenueRange);
    }
    if (filters?.creationYearFrom) {
      query.set('creationYearFrom', String(filters.creationYearFrom));
    }
    if (filters?.creationYearTo) {
      query.set('creationYearTo', String(filters.creationYearTo));
    }

    return this.http.get<PaginatedResponse<Oferta>>(`${this.apiUrl}?${query.toString()}`);
  }

  getOfertaById(id: string): Observable<Oferta> {
    return this.http.get<Oferta>(`${this.apiUrl}/${id}`);
  }

  registerView(id: string): Observable<{ detailViewCount: number }> {
    return this.http.post<{ detailViewCount: number }>(`${this.apiUrl}/${id}/view`, {});
  }

  getOfertaAnalytics(id: string): Observable<OfertaAnalytics> {
    return this.http.get<OfertaAnalytics>(`${this.apiUrl}/${id}/analytics`);
  }

  getMisOfertasAnalyticsSummary(): Observable<OwnerAnalyticsSummary> {
    return this.http.get<OwnerAnalyticsSummary>(`${this.apiUrl}/me/analytics-summary`);
  }

  getMisOfertas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.apiUrl}/me`);
  }

  getMisOfertasPaged(page: number, limit: number): Observable<PaginatedResponse<Oferta>> {
    return this.http.get<PaginatedResponse<Oferta>>(`${this.apiUrl}/me?page=${page}&limit=${limit}`);
  }

  getMisFavoritas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.apiUrl}/favorites`);
  }

  getMisFavoritasPaged(page: number, limit: number): Observable<PaginatedResponse<Oferta>> {
    return this.http.get<PaginatedResponse<Oferta>>(`${this.apiUrl}/favorites?page=${page}&limit=${limit}`);
  }

  addFavorita(ofertaId: string): Observable<{ message: string; favoriteCount: number }> {
    return this.http.post<{ message: string; favoriteCount: number }>(`${this.apiUrl}/${ofertaId}/favorite`, {});
  }

  purchasePublicationCredit(): Observable<{ publicationCredits: number }> {
    return this.http.post<{ publicationCredits: number }>(`${this.apiUrl}/publication-credit/purchase`, {});
  }

  removeFavorita(ofertaId: string): Observable<{ message: string; favoriteCount: number }> {
    return this.http.delete<{ message: string; favoriteCount: number }>(`${this.apiUrl}/${ofertaId}/favorite`);
  }

  createOferta(oferta: Partial<Oferta>): Observable<Oferta> {
    return this.http.post<Oferta>(this.apiUrl, oferta);
  }

  updateOferta(id: string, oferta: Partial<Oferta>): Observable<Oferta> {
    return this.http.put<Oferta>(`${this.apiUrl}/${id}`, oferta);
  }

  deleteOferta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
