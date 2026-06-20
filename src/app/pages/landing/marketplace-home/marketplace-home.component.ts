import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, computed, DestroyRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Oferta } from '../../../core/models/oferta.model';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { getSectorToneClass } from '../../../shared/utils/sector-tone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ChatService } from '../../../core/services/chat.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MARKETPLACE_EMPLOYEE_RANGE_OPTIONS,
  MARKETPLACE_LOCATION_SUGGESTIONS,
  MARKETPLACE_REVENUE_RANGE_OPTIONS,
  MARKETPLACE_SECTOR_OPTIONS
} from '../../../shared/utils/marketplace-options';

@Component({
  selector: 'app-marketplace-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, FormsModule],
  templateUrl: './marketplace-home.component.html',
  styleUrl: './marketplace-home.component.css'
})
export class MarketplaceHomeComponent {
  private ofertaService = inject(OfertaService);
  private marketplaceSearchService = inject(MarketplaceSearchService);
  public authService = inject(AuthService);
  private translate = inject(TranslateService);
  private solicitudService = inject(SolicitudService);
  private chatService = inject(ChatService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private mapUrlCache = new Map<string, SafeResourceUrl>();

  ofertas = signal<Oferta[]>([]);
  favoriteOfferIds = signal<Set<string>>(new Set());
  solicitudesMap = signal<Map<string, string>>(new Map());
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  page = signal<number>(1);
  pagination = signal<PaginationMeta | null>(null);

  displayedOfertas = computed(() => (this.authService.isLoggedIn() ? this.ofertas() : this.ofertas().slice(0, 4)));

  searchQuery = this.marketplaceSearchService.query;
  selectedSector = signal('');
  selectedRegion = signal('');
  selectedEmployeeRange = signal('');
  selectedRevenueRange = signal('');
  selectedCreationYearFrom = signal<number | null>(null);
  selectedCreationYearTo = signal<number | null>(null);

  sectorOptions = MARKETPLACE_SECTOR_OPTIONS;
  locationSuggestions = MARKETPLACE_LOCATION_SUGGESTIONS;
  employeeRangeOptions = MARKETPLACE_EMPLOYEE_RANGE_OPTIONS;
  revenueRangeOptions = MARKETPLACE_REVENUE_RANGE_OPTIONS;

  canUseAdvancedFilters = computed(() => this.authService.isLoggedIn() && this.authService.isPro());
  showProInvite = computed(
    () => this.authService.isLoggedIn() && this.authService.isInterested() && !this.authService.isPro()
  );
  hasActiveSearch = computed(() => !!this.searchQuery().trim());
  pageSize = computed(() =>
    this.authService.isLoggedIn() && !this.authService.isPro() && this.hasActiveSearch() ? 24 : 12
  );

  constructor() {
    this.listenToSolicitudChanges();

    effect(() => {
      this.searchQuery();
      this.selectedSector();
      this.selectedRegion();
      this.selectedEmployeeRange();
      this.selectedRevenueRange();
      this.selectedCreationYearFrom();
      this.selectedCreationYearTo();
      this.page.set(1);
    });

    effect((onCleanup) => {
      const currentPage = this.page();
      const currentSearch = this.searchQuery();
      const currentPageSize = this.pageSize();

      this.isLoading.set(true);
      this.error.set(null);

      const peticion = this.ofertaService
        .getOfertasPaged(currentPage, currentPageSize, currentSearch, this.buildAdvancedFilters())
        .subscribe({
          next: (result) => {
            this.ofertas.set(result.items);
            this.pagination.set(result.pagination);
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

  private buildAdvancedFilters():
    | {
        sector?: string;
        region?: string;
        employeeRange?: string;
        revenueRange?: string;
        creationYearFrom?: number | null;
        creationYearTo?: number | null;
      }
    | undefined {
    if (!this.canUseAdvancedFilters()) {
      return undefined;
    }

    return {
      sector: this.selectedSector() || undefined,
      region: this.selectedRegion().trim() || undefined,
      employeeRange: this.selectedEmployeeRange() || undefined,
      revenueRange: this.selectedRevenueRange() || undefined,
      creationYearFrom: this.selectedCreationYearFrom(),
      creationYearTo: this.selectedCreationYearTo()
    };
  }

  clearAdvancedFilters(): void {
    this.selectedSector.set('');
    this.selectedRegion.set('');
    this.selectedEmployeeRange.set('');
    this.selectedRevenueRange.set('');
    this.selectedCreationYearFrom.set(null);
    this.selectedCreationYearTo.set(null);
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

  isBlurredResult(index: number): boolean {
    return this.authService.isLoggedIn() && !this.authService.isPro() && this.hasActiveSearch() && index >= 12;
  }

  cardRoute(ofertaId: string | undefined, index: number): string[] {
    if (this.isBlurredResult(index)) {
      return ['/pago-simulado', 'pro'];
    }

    if (this.authService.isLoggedIn()) {
      return ['/ofertas', ofertaId ?? ''];
    }

    return ['/register'];
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

  showPager(): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    if (!this.authService.isPro() && this.hasActiveSearch()) {
      return false;
    }

    return (this.pagination()?.totalPages ?? 1) > 1;
  }

  private listenToSolicitudChanges(): void {
    this.chatService.solicitudUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((solicitud) => {
      if (solicitud.opportunity?._id) {
        this.solicitudesMap.update((current) => {
          const next = new Map(current);
          next.set(solicitud.opportunity._id, solicitud.status);
          return next;
        });
      }
    });

    this.chatService.solicitudDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.solicitudesMap.update((current) => {
        const next = new Map(current);
        next.delete(event.opportunityId);
        return next;
      });
    });
  }
}
