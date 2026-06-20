import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Historial, HistorialPaginatedResponse } from '../models/historial.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private apiUrl = 'http://localhost:4000/api/historials';
  private http = inject(HttpClient);

  // 1. LLISTAT: Obtenir historials amb paginació i cercador
  getHistorials(page = 1, limit = 10, search = ''): Observable<HistorialPaginatedResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<HistorialPaginatedResponse>(this.apiUrl, { params });
  }

  // 2. DETALL: Obtenir un historial per ID (per complir els 3 mètodes de l'enunciat)
  getHistorialById(id: string): Observable<Historial> {
    return this.http.get<Historial>(`${this.apiUrl}/${id}`);
  }

  // 3. ESBORRAR: Eliminar un historial
  deleteHistorial(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
