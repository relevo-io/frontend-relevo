import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertaService } from '../../../../core/services/oferta.service'; 
import { Oferta } from '../../../../core/models/oferta.model'; 

@Component({
  selector: 'app-oferta-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oferta-list.component.html',
  styleUrl: './oferta-list.component.css'
})
export class OfertaListComponent implements OnInit {
  private ofertaService = inject(OfertaService);
  
  ofertas: Oferta[] = [];

  ngOnInit() {
    this.cargarOfertas();
  }

  cargarOfertas() {
    this.ofertaService.getOfertas().subscribe({
      next: (datosDelServidor) => {
        this.ofertas = datosDelServidor;
        console.log('¡Ofertas recibidas de Mongo!', this.ofertas);
      },
      error: (error) => {
        console.error('Error al conectar con el backend:', error);
      }
    });
  }
}