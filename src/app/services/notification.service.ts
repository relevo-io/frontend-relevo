import { Injectable, signal } from '@angular/core';

/**
 * Union type para restringir los tipos de mensajes permitidos.
 * Esto asegura que solo usemos estados semánticos (éxito, error, etc.)
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Representa una notificación individual en el sistema.
 */
export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration: number; // Nueva propiedad para la barra de progreso
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Signal privado: solo este servicio puede ESCRIBIR en la lista de notificaciones.
  private notifications = signal<Notification[]>([]);

  // Signal público de LECTURA: los componentes solo pueden LEER esta lista.
  readonly currentNotifications = this.notifications.asReadonly();

  /**
   * Muestra una notificación que se autodestruye tras el tiempo indicado.
   * @param message El texto a mostrar
   * @param type El estilo visual de la alerta
   * @param duration Tiempo en ms antes de desaparecer
   */
  show(message: string, type: NotificationType = 'info', duration = 2000): void {
    const id = Date.now();

    // Inmutabilidad: creamos un nuevo array con la notificación añadida.
    this.notifications.update(prev => [...prev, { id, message, type, duration }]);

    // Temporizador para limpiar la notificación automáticamente
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  /**
   * Elimina una notificación manualmente por su ID.
   */
  remove(id: number): void {
    this.notifications.update(prev => prev.filter(n => n.id !== id));
  }

  // Atajos semánticos para mayor comodidad en el resto de la app
  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 3000); } // Errores duran un poco más
  warn(msg: string) { this.show(msg, 'warning'); }
  info(msg: string) { this.show(msg, 'info'); }
}
