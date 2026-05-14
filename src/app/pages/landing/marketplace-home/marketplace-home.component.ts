import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Oferta } from '../../../core/models/oferta.model';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-marketplace-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './marketplace-home.component.html',
  styleUrl: './marketplace-home.component.css'
})
export class MarketplaceHomeComponent {
  private ofertaService = inject(OfertaService);
  private marketplaceSearchService = inject(MarketplaceSearchService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

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
    effect((onCleanup) => {
      // 1. Al leer currentUser(), el effect se queda escuchando sus cambios
      const currentUserId = this.authService.currentUser()?._id;

      this.isLoading.set(true);
      this.error.set(null);

      // 2. Lanzamos la petición HTTP y la guardamos en una variable
      const peticion = this.ofertaService.getOfertas(currentUserId).subscribe({
        next: (datosDelServidor) => {
          this.ofertas.set(datosDelServidor);
          this.isLoading.set(false);
        },
        error: (backendError) => {
          console.error('Error al conectar con el backend:', backendError);
          this.error.set(this.translate.instant('MARKETPLACE_HOME.LOADING_ERROR'));
          this.isLoading.set(false);
        }
      });

      // 3. Si el usuario cambia mientras la petición 1 estaba en vuelo,
      // Angular cancelará la petición 1 antes de lanzar la petición 2.
      onCleanup(() => {
        peticion.unsubscribe();
      });
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
