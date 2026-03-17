import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Oportunidad } from '../models/oportunidad.model';

@Injectable({
  providedIn: 'root'
})
export class OportunidadService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:4000/api/ofertas'; 

  constructor() { }

  getOportunidades(): Observable<Oportunidad[]> {
    return this.http.get<Oportunidad[]>(this.apiUrl);
  }
}