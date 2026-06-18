import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Oferta } from '../../../core/models/oferta.model';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { getSectorToneClass } from '../../../shared/utils/sector-tone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { SolicitudService } from '../../../core/services/solicitud.service';

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
  private solicitudService = inject(SolicitudService);
  private sanitizer = inject(DomSanitizer);
  private mapUrlCache = new Map<string, SafeResourceUrl>();

  ofertas = signal<Oferta[]>([]);
  favoriteOfferIds = signal<Set<string>>(new Set());
  solicitudesMap = signal<Map<string, string>>(new Map());
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pageSize = 12;
  pagination = signal<PaginationMeta | null>(null);

  displayedOfertas = computed(() => (this.authService.isLoggedIn() ? this.ofertas() : this.ofertas().slice(0, 4)));

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

        this.solicitudService.getMisSolicitudesEnviadas().subscribe({
          next: (solicitudes) => {
            const map = new Map<string, string>();
            for (const sol of solicitudes) {
              if (sol.opportunity?._id) {
                map.set(sol.opportunity._id, sol.status);
              }
            }
            this.solicitudesMap.set(map);
          },
          error: () => {
            this.solicitudesMap.set(new Map());
          }
        });
      } else {
        this.favoriteOfferIds.set(new Set());
        this.solicitudesMap.set(new Map());
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

  sectorToneClass(sector?: string): string {
    return getSectorToneClass(sector);
  }

  mapUrl(region?: string): SafeResourceUrl {
    const location = region?.trim() || 'Espana';
    const cached = this.mapUrlCache.get(location);
    if (cached) return cached;

    const query = encodeURIComponent(`${location}, Espana`);
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${query}&z=12&output=embed`
    );
    this.mapUrlCache.set(location, url);
    return url;
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
        next: ({ favoriteCount }) => {
          const updated = new Set(this.favoriteOfferIds());
          updated.delete(ofertaId);
          this.favoriteOfferIds.set(updated);
          this.updateOfferFavoriteCount(ofertaId, favoriteCount);
        }
      });
      return;
    }

    this.ofertaService.addFavorita(ofertaId).subscribe({
      next: ({ favoriteCount }) => {
        const updated = new Set(this.favoriteOfferIds());
        updated.add(ofertaId);
        this.favoriteOfferIds.set(updated);
        this.updateOfferFavoriteCount(ofertaId, favoriteCount);
      }
    });
  }

  private updateOfferFavoriteCount(ofertaId: string, favoriteCount: number): void {
    this.ofertas.update((ofertas) =>
      ofertas.map((oferta) => (oferta._id === ofertaId ? { ...oferta, favoriteCount } : oferta))
    );
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
