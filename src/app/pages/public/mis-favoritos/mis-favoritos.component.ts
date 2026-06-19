import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OfertaService } from '../../../core/services/oferta.service';
import { Oferta } from '../../../core/models/oferta.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { getSectorToneClass } from '../../../shared/utils/sector-tone';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-mis-favoritos',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './mis-favoritos.component.html',
  styleUrl: './mis-favoritos.component.css'
})
export class MisFavoritosComponent implements OnInit {
  private ofertaService = inject(OfertaService);

  favoritas = signal<Oferta[]>([]);
  isLoading = signal<boolean>(true);
  page = signal<number>(1);
  pageSize = 8;
  pagination = signal<PaginationMeta | null>(null);

  ngOnInit(): void {
    this.cargarFavoritas();
  }

  cargarFavoritas(): void {
    this.isLoading.set(true);
    this.ofertaService.getMisFavoritasPaged(this.page(), this.pageSize).subscribe({
      next: (result) => {
        this.favoritas.set(result.items);
        this.pagination.set(result.pagination);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  quitarFavorita(ofertaId?: string): void {
    if (!ofertaId) return;

    this.ofertaService.removeFavorita(ofertaId).subscribe({
      next: () => {
        this.cargarFavoritas();
      }
    });
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

  prevPage(): void {
    const meta = this.pagination();
    if (!meta?.hasPrevPage) return;
    this.page.set(meta.page - 1);
    this.cargarFavoritas();
  }

  nextPage(): void {
    const meta = this.pagination();
    if (!meta?.hasNextPage) return;
    this.page.set(meta.page + 1);
    this.cargarFavoritas();
  }
}
