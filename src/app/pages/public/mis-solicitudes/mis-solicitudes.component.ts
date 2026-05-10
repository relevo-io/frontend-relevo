import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { Solicitud } from '../../../core/models/solicitud.model';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule],
  templateUrl: './mis-solicitudes.component.html',
  styleUrls: ['./mis-solicitudes.component.css']
})
export class MisSolicitudesComponent implements OnInit {
  private solicitudService = inject(SolicitudService);
  
  solicitudes = signal<Solicitud[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes() {
    this.isLoading.set(true);
    this.solicitudService.getMisSolicitudesOwner().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  cambiarEstado(id: string | undefined, status: string) {
    if (!id) return;
    this.solicitudService.updateStatus(id, status).subscribe({
      next: (actualizada) => {
        this.solicitudes.update(sols => 
          sols.map(s => s._id === id ? { ...s, status: actualizada.status } : s)
        );
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
      }
    });
  }
}
