import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudService } from '../../../services/solicitud.service';
import { Solicitud } from '../../../models/solicitud.model';

@Component({
  selector: 'app-solicitudes-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes-list.component.html',
  styleUrl: './solicitudes-list.component.css',
})
export class SolicitudesList {
  solicitudes: Solicitud[] = [];
  loading: boolean = true;

  constructor(private solicitudService: SolicitudService) {}

  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.solicitudService.getSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando solicitudes', err);
        this.loading = false;
      }
    });
  }
}
