import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaOferta, CreateAlertaOfertaRequest } from '../models/alerta.model';

@Injectable({
  providedIn: 'root'
})
export class AlertaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/alertas`;

  getAlertas(): Observable<AlertaOferta[]> {
    return this.http.get<AlertaOferta[]>(this.apiUrl);
  }

  createAlerta(payload: CreateAlertaOfertaRequest): Observable<AlertaOferta> {
    return this.http.post<AlertaOferta>(this.apiUrl, payload);
  }

  deleteAlerta(alertaId: string): Observable<AlertaOferta | null> {
    return this.http.delete<AlertaOferta | null>(`${this.apiUrl}/${alertaId}`);
  }
}
