import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Solicitud } from '../models/solicitud.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SolicitudService {
  private API_URL = `${environment.apiUrl}/api/solicitudes`;
  private STORAGE_URL = `${environment.apiUrl}/api/storage`;
  private http = inject(HttpClient);

  // Obtener todas las solicitudes
  getSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.API_URL);
  }

  // Actualizar el estado de una solicitud
  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/status`, { status });
  }

  // Obtener las solicitudes donde el usuario es el dueño de la oferta
  getMisSolicitudesOwner(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.API_URL}/me/recibidas`);
  }

  getMisSolicitudesEnviadas(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${this.API_URL}/me/enviadas`);
  }

  crearSolicitud(data: { opportunityId: string; message: string }): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.API_URL, data);
  }

  deleteMultiple(ids: string[]) {
    return this.http.request('delete', `${this.API_URL}/batch`, {
      body: { ids }
    });
  }

  getMiSolicitudParaOferta(ofertaId: string): Observable<Solicitud | null> {
    return this.http.get<Solicitud | null>(`${this.API_URL}/oferta/${ofertaId}/me`);
  }

  // ─── S3 Upload Flow ──────────────────────────────────────────────────────────

  /**
   * Step 1: Ask the backend for a pre-signed PUT URL.
   * Returns { uploadUrl, s3Key }.
   */
  getPresignedUploadUrl(filename: string): Observable<{ uploadUrl: string; s3Key: string }> {
    return this.http.get<{ uploadUrl: string; s3Key: string }>(`${this.STORAGE_URL}/presigned-url`, {
      params: { filename }
    });
  }

  /**
   * Step 2: PUT the file directly to S3.
   * IMPORTANT: We must NOT send our app's Authorization header here — S3 will reject it.
   * Angular's HttpClient interceptors add the auth header globally, so we explicitly
   * override the headers to only set Content-Type.
   */
  uploadCvToS3(uploadUrl: string, file: File): Observable<void> {
    return this.http.put<void>(uploadUrl, file, {
      headers: new HttpHeaders({ 'Content-Type': file.type || 'application/pdf' })
      // Skip our app's auth interceptor for this external S3 call
    });
  }

  /**
   * Step 3: Notify the backend to persist the S3 key in the Solicitud document.
   */
  guardarCvKey(solicitudId: string, cvKey: string): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.API_URL}/${solicitudId}/guardar-cv`, { cvKey });
  }

  /**
   * Get a 2-minute read URL to view the candidate's CV PDF.
   */
  getViewUrl(solicitudId: string): Observable<{ viewUrl: string }> {
    return this.http.get<{ viewUrl: string }>(`${this.API_URL}/${solicitudId}/ver-cv`);
  }

  /**
   * Inicia el proceso de análisis del CV con IA en el backend.
   */
  analizarCvConIa(solicitudId: string): Observable<Solicitud> {
    return this.http.post<Solicitud>(`${this.API_URL}/${solicitudId}/analizar-cv`, {});
  }
}
