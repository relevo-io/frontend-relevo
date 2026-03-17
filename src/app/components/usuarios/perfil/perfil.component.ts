import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudAccesoService } from '../../../services/solicitud-acceso.service';
import { SolicitudAcceso } from '../../../models/comunicacion.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  private solicitudService = inject(SolicitudAccesoService);

  // --- DATOS DEL FORMULARIO ---
  mensajeNuevo: string = '';
  
  // IDs DE PRUEBA (Sustituye por IDs reales de tu MongoDB de 24 caracteres)
  miUserId = "65f1a2b3c4d5e6f7a8b9c034";
  oportunidadIdTest = "65f1a2b3c4d5e6f7a8b9c012";
  ownerIdTest = "65f1a2b3c4d5e6f7a8b9c056";

  // --- LISTA DE SOLICITUDES ---
  misSolicitudes: SolicitudAcceso[] = [];

  ngOnInit() {
    this.cargarSolicitudes();
  }

  // L - LEER (Read)
  cargarSolicitudes() {
    this.solicitudService.getSolicitudesPorUsuario(this.miUserId).subscribe({
      next: (data) => this.misSolicitudes = data,
      error: (err) => console.error('Error al cargar lista:', err)
    });
  }

  // C - CREAR (Create)
  enviarSolicitud() {
  if (!this.mensajeNuevo.trim()) return;

  // Vamos a usar un ID de oportunidad real que YA CARGÓ en tu lista
  // Esto asegura que la oportunidad existe.
  const data: SolicitudAcceso = {
    opportunity: this.misSolicitudes[0]?.opportunity || "65f1a2b3c4d5e6f7a8b9c012", 
    interestedUser: "65f1a2b3c4d5e6f7a8b9c034", 
    owner: "65f1a2b3c4d5e6f7a8b9c056", 
    message: this.mensajeNuevo,
    status: 'PENDING'
  };

  console.log("Datos enviados al servidor:", data);

  this.solicitudService.crearSolicitud(data).subscribe({
    next: (res) => {
      this.mensajeNuevo = '';
      this.cargarSolicitudes();
      alert('¡Éxito!');
    },
    error: (err) => {
      // AQUÍ ESTÁ EL TRUCO: Accedemos al mensaje de error del backend
      console.error("Detalle técnico del error:", err.error); 
      alert("Error del Servidor: " + JSON.stringify(err.error));
    }
  });
}

}