import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedNotificationsResponse, NotificationHistory } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationHistoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/notificaciones`;

  public notificationRead$ = new Subject<string>();

  /**
   * Obtiene las notificaciones paginadas
   */
  public getNotifications(page = 1, limit = 15): Observable<PaginatedNotificationsResponse> {
    return this.http.get<PaginatedNotificationsResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(id: string): Observable<{ success: boolean; notification: NotificationHistory }> {
    return this.http
      .patch<{ success: boolean; notification: NotificationHistory }>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        tap((res) => {
          if (res.success) {
            this.notificationRead$.next(id);
          }
        })
      );
  }

  public notificationsReadByType$ = new Subject<'solicitud' | 'cv_analysis' | 'chat'>();

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/read-all`, {}).pipe(
      tap((res) => {
        if (res.success) {
          // Opcionalmente podemos resetear localmente también
        }
      })
    );
  }

  /**
   * Marca todas las notificaciones de un tipo como leídas
   */
  public markReadByType(type: 'solicitud' | 'cv_analysis' | 'chat'): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/read-by-type`, { type }).pipe(
      tap((res) => {
        if (res.success) {
          this.notificationsReadByType$.next(type);
        }
      })
    );
  }

  /**
   * Elimina una notificación por ID
   */
  public deleteNotification(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Vacía toda la bandeja de notificaciones
   */
  public clearAll(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(this.apiUrl);
  }
}
