import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Oferta } from '../../../core/models/oferta.model';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaginationMeta } from '../../../core/models/pagination.model';

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
  public authService = inject(AuthService);
  private translate = inject(TranslateService);

  ofertas = signal<Oferta[]>([]);
  favoriteOfferIds = signal<Set<string>>(new Set());
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = 12;
  pagination = signal<PaginationMeta | null>(null);

  searchQuery = this.marketplaceSearchService.query;
  sectoresDestacados = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.searchQuery();
      this.page.set(1);
    });

    effect((onCleanup) => {
      const currentUserId = this.authService.currentUser()?._id;
      const currentPage = this.page();
      const currentSearch = this.searchQuery();

      this.isLoading.set(true);
      this.error.set(null);

      const peticion = this.ofertaService
        .getOfertasPaged(currentPage, this.pageSize, currentUserId, currentSearch)
        .subscribe({
          next: (result) => {
            this.ofertas.set(result.items);
            this.pagination.set(result.pagination);
            this.refreshFeaturedSectors();
            this.isLoading.set(false);
          },
          error: (backendError) => {
            console.error('Error al conectar con el backend:', backendError);
            this.error.set(this.translate.instant('MARKETPLACE_HOME.LOADING_ERROR'));
            this.isLoading.set(false);
          }
        });

      if (this.authService.isLoggedIn()) {
        this.ofertaService.getMisFavoritas().subscribe({
          next: (favoritas) => {
            this.favoriteOfferIds.set(new Set(favoritas.map((item) => item._id).filter((id): id is string => !!id)));
          },
          error: () => {
            this.favoriteOfferIds.set(new Set());
          }
        });
      } else {
        this.favoriteOfferIds.set(new Set());
      }

      onCleanup(() => {
        peticion.unsubscribe();
      });
    });
  }

  private refreshFeaturedSectors(): void {
    const uniques = new Set(
      this.ofertas()
        .map((oferta) => oferta.sector)
        .filter((sector): sector is string => !!sector?.trim())
    );
    this.sectoresDestacados.set(Array.from(uniques).slice(0, 6));
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

  isFavorite(ofertaId?: string): boolean {
    if (!ofertaId) return false;
    return this.favoriteOfferIds().has(ofertaId);
  }

  toggleFavorite(event: Event, ofertaId?: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (!ofertaId || !this.authService.isLoggedIn()) {
      return;
    }

    const currentlyFavorite = this.favoriteOfferIds().has(ofertaId);

    if (currentlyFavorite) {
      this.ofertaService.removeFavorita(ofertaId).subscribe({
        next: () => {
          const updated = new Set(this.favoriteOfferIds());
          updated.delete(ofertaId);
          this.favoriteOfferIds.set(updated);
        }
      });
      return;
    }

    this.ofertaService.addFavorita(ofertaId).subscribe({
      next: () => {
        const updated = new Set(this.favoriteOfferIds());
        updated.add(ofertaId);
        this.favoriteOfferIds.set(updated);
      }
    });
  }

  prevPage(): void {
    const meta = this.pagination();
    if (!meta?.hasPrevPage) return;
    this.page.set(meta.page - 1);
  }

  nextPage(): void {
    const meta = this.pagination();
    if (!meta?.hasNextPage) return;
    this.page.set(meta.page + 1);
  }
}
