import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OportunidadService } from '../../../services/oportunidad.service'; 
import { Oportunidad } from '../../../models/oportunidad.model'; 

@Component({
  selector: 'app-oportunidad-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oportunidad-list.component.html',
  styleUrl: './oportunidad-list.component.css'
})
export class OportunidadListComponent implements OnInit {
  private oportunidadService = inject(OportunidadService);
  
  oportunidades: Oportunidad[] = [];

  ngOnInit() {
    this.cargarOportunidades();
  }

  cargarOportunidades() {
    this.oportunidadService.getOportunidades().subscribe({
      next: (datosDelServidor) => {
        this.oportunidades = datosDelServidor;
        console.log('¡Oportunidades (ofertas) recibidas de Mongo!', this.oportunidades);
      },
      error: (error) => {
        console.error('Error al conectar con el backend:', error);
      }
    });
  }
}