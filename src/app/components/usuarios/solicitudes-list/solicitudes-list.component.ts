import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudService } from '../../../services/solicitud.service';
import { Solicitud } from '../../../models/solicitud.model';
import { ChangeDetectorRef } from '@angular/core';

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

  constructor(private solicitudService: SolicitudService,private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.solicitudes = [];

    this.solicitudService.getSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando solicitudes', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstado(id: string, nuevoEstado: 'ACCEPTED' | 'REJECTED'): void {
    this.solicitudService.updateStatus(id, nuevoEstado).subscribe({
      next: () => {
      // Volvemos a llamar al servidor para traer la lista fresca
      this.cargarSolicitudes(); 
    },
    error: (err) => {
      alert('Error al actualizar');
    }
  });
  }
}
