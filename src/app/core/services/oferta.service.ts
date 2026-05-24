import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Oferta } from '../models/oferta.model';
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
    search?: string
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

    return this.http.get<PaginatedResponse<Oferta>>(`${this.apiUrl}?${query.toString()}`);
  }

  getOfertaById(id: string): Observable<Oferta> {
    return this.http.get<Oferta>(`${this.apiUrl}/${id}`);
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

  addFavorita(ofertaId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${ofertaId}/favorite`, {});
  }

  removeFavorita(ofertaId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${ofertaId}/favorite`);
  }

  createOferta(oferta: Oferta): Observable<Oferta> {
    return this.http.post<Oferta>(this.apiUrl, oferta);
  }

  updateOferta(id: string, oferta: Oferta): Observable<Oferta> {
    return this.http.put<Oferta>(`${this.apiUrl}/${id}`, oferta);
  }

  deleteOferta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
