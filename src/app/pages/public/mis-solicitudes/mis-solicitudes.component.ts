import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { Solicitud } from '../../../core/models/solicitud.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.css'
})
export class MisSolicitudesComponent implements OnInit {
  private solicitudService = inject(SolicitudService);
  private ns = inject(NotificationService);

  solicitudes = signal<Solicitud[]>([]);
  isLoading = signal<boolean>(true);
  
  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.isLoading.set(true);
    this.solicitudService.getMisSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.ns.error('Error al cargar las solicitudes');
        this.isLoading.set(false);
      }
    });
  }

  responder(id: string, estado: 'ACCEPTED' | 'REJECTED'): void {
    this.solicitudService.updateStatus(id, estado).subscribe({
      next: () => {
        this.ns.success(estado === 'ACCEPTED' ? 'Solicitud aceptada' : 'Solicitud rechazada');
        this.solicitudes.update(actuales => 
          actuales.map(s => s._id === id ? { ...s, status: estado } : s)
        );
      },
      error: () => this.ns.error('Hubo un error al actualizar el estado')
    });
  }
}
