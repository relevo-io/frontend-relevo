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

  getOfertas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(this.apiUrl);
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
