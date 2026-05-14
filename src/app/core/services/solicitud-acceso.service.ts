import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SolicitudAcceso } from '../models/comunicacion.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SolicitudAccesoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/solicitudes`;

  crearSolicitud(datos: SolicitudAcceso): Observable<SolicitudAcceso> {
    return this.http.post<SolicitudAcceso>(this.apiUrl, datos);
  }

  getSolicitudesPorUsuario(userId: string): Observable<SolicitudAcceso[]> {
    return this.http.get<SolicitudAcceso[]>(this.apiUrl);
  }
}
