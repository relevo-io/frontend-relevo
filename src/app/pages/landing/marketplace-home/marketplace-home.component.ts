import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Oferta } from '../../../core/models/oferta.model';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';

@Component({
  selector: 'app-marketplace-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './marketplace-home.component.html',
  styleUrl: './marketplace-home.component.css',
})
export class MarketplaceHomeComponent {
  private ofertaService = inject(OfertaService);
  private marketplaceSearchService = inject(MarketplaceSearchService);
  private authService = inject(AuthService);

  ofertas = signal<Oferta[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchQuery = this.marketplaceSearchService.query;

  filteredOfertas = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.ofertas();
    }

    return this.ofertas().filter((oferta) => {
      const sector = oferta.sector?.toLowerCase() ?? '';
      const region = oferta.region?.toLowerCase() ?? '';
      const description = oferta.companyDescription?.toLowerCase() ?? '';
      const revenue = oferta.revenueRange?.toLowerCase() ?? '';
      const employees = oferta.employeeRange?.toLowerCase() ?? '';
      return (
        sector.includes(query) ||
        region.includes(query) ||
        description.includes(query) ||
        revenue.includes(query) ||
        employees.includes(query)
      );
    });
  });

  sectoresDestacados = computed(() => {
    const uniques = new Set(
      this.ofertas()
        .map((oferta) => oferta.sector)
        .filter((sector): sector is string => !!sector?.trim())
    );
    return Array.from(uniques).slice(0, 6);
  });

  constructor() {
    effect(() => {
      this.authService.currentUser();
      this.cargarOfertas();
    });
  }

  cargarOfertas(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const currentUserId = this.authService.currentUser()?._id;

    this.ofertaService.getOfertas(currentUserId).subscribe({
      next: (datosDelServidor) => {
        this.ofertas.set(datosDelServidor);
        this.isLoading.set(false);
      },
      error: (backendError) => {
        console.error('Error al conectar con el backend:', backendError);
        this.error.set('No se pudieron cargar las ofertas. Inténtalo de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  filtrarPorSector(sector: string): void {
    this.marketplaceSearchService.setQuery(sector);
  }

  limpiarFiltro(): void {
    this.marketplaceSearchService.clear();
  }

  formatRevenue(value?: string): string {
    return formatRevenueRange(value);
  }

  formatEmployees(value?: string): string {
    return formatEmployeeRange(value);
  }
}
