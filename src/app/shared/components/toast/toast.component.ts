import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Componente flotante que se encarga de DIBUJAR las notificaciones en pantalla.
 * Se inyectará en la raíz para ser visible sobre cualquier página.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  // Inyectamos el cerebro de notificaciones
  private ns = inject(NotificationService);

  // Leemos el signal de solo lectura que expone el servicio
  notifications = this.ns.currentNotifications;

  /**
   * Permite al usuario cerrar la alerta haciendo click en la X.
   */
  remove(id: number): void {
    this.ns.remove(id);
  }
}
