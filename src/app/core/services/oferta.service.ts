import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Oferta } from '../models/oferta.model';

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:4000/api/ofertas'; 

  getOfertas(excludeOwnerId?: string): Observable<Oferta[]> {
    if (excludeOwnerId) {
      return this.http.get<Oferta[]>(`${this.apiUrl}?excludeOwnerId=${excludeOwnerId}`);
    }
    return this.http.get<Oferta[]>(this.apiUrl);
  }

  getOfertaById(id: string): Observable<Oferta> {
    return this.http.get<Oferta>(`${this.apiUrl}/${id}`);
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
