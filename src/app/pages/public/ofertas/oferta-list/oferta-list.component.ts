import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertaService } from '../../../../core/services/oferta.service'; 
import { Oferta } from '../../../../core/models/oferta.model'; 
import { SolicitudService } from '../../../../core/services/solicitud.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-ofertas-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oferta-list.component.html',
  styleUrl: './oferta-list.component.css'
})
export class OfertaListComponent implements OnInit {
  private ofertaService = inject(OfertaService);
  private solicitudService = inject(SolicitudService);
  private ns = inject(NotificationService);
  
  ofertas = signal<Oferta[]>([]);
  isLoading = signal<boolean>(true);

  // Estado del Drawer (Panel lateral de detalles)
  drawerOpen = signal<boolean>(false);
  ofertaSeleccionada = signal<Oferta | null>(null);

  ngOnInit(): void {
    this.fetchOfertas();
  }
  
  fetchOfertas(): void {
    this.isLoading.set(true);
    this.ofertaService.getOfertasMarketplace().subscribe({
      next: (data) => {
        this.ofertas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando el marketplace:', err);
        this.ns.error('Error al cargar las ofertas disponibles.');
        this.isLoading.set(false);
      }
    });
  }

  verDetalles(oferta: Oferta): void {
    this.ofertaSeleccionada.set(oferta);
    this.drawerOpen.set(true);
  }

  cerrarDrawer(): void {
    this.drawerOpen.set(false);
    // Esperamos a que termine la animación CSS para borrar el dato
    setTimeout(() => this.ofertaSeleccionada.set(null), 300);
  }

  solicitarAcceso(opportunityId: string): void {
    const defaultMessage = 'Hola, estoy muy interesado en conocer más detalles sobre esta oportunidad de negocio para una posible adquisición.';
    
    this.solicitudService.crearSolicitud({ opportunityId, message: defaultMessage }).subscribe({
      next: () => {
        this.ns.success('Solicitud enviada. El propietario revisará tu perfil.');
        if (this.drawerOpen()) {
          this.cerrarDrawer();
        }
      },
      error: (err) => {
        // Aprovechamos los mensajes de error exactos que configuramos en el backend
        if (err.error?.message) {
          this.ns.error(err.error.message);
        } else {
          this.ns.error('Hubo un error al procesar tu solicitud.');
        }
      }
    });
  }

  // Utilidad para mostrar los Enums de forma amigable en el HTML
  formatRango(rango?: string): string {
    if (!rango) return 'No especificado';
    const map: Record<string, string> = {
      'UNDER_100K': 'Menos de 100.000€',
      'BETWEEN_100K_500K': '100.000€ - 500.000€',
      'BETWEEN_500K_1M': '500.000€ - 1M€',
      'BETWEEN_1M_5M': '1M€ - 5M€',
      'OVER_5M': 'Más de 5M€',
      '1_5': '1 a 5 empleados',
      '6_10': '6 a 10 empleados',
      '11_25': '11 a 25 empleados',
      '26_50': '26 a 50 empleados',
      '51_100': '51 a 100 empleados',
      '100_PLUS': 'Más de 100 empleados'
    };
    return map[rango] || rango;
  }
}