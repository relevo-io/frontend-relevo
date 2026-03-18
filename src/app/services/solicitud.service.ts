import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Solicitud } from '../models/solicitud.model';
import { ChangeDetectorRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SolicitudService {
  private API_URL = 'http://localhost:4000/api/solicitudes'; 

  constructor(
    private http: HttpClient,
  ) {}

  // Obtener todas las solicitudes
  getSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.API_URL);
  }

  // Actualizar el estado de una solicitud
  updateStatus(id: string, status: string): Observable<any> {
  return this.http.patch(`${this.API_URL}/${id}/status`, { status });
}
}