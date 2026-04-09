import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SolicitudAcceso } from '../models/comunicacion.model';

@Injectable({ providedIn: 'root' })
export class SolicitudAccesoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:4000/api/solicitudes';

  crearSolicitud(datos: SolicitudAcceso): Observable<SolicitudAcceso> {
    return this.http.post<SolicitudAcceso>(this.apiUrl, datos);
  }

  getSolicitudesPorUsuario(userId: string): Observable<SolicitudAcceso[]> {
  return this.http.get<SolicitudAcceso[]>(this.apiUrl); 
}
}