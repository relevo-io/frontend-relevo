import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OfertaService } from '../../../core/services/oferta.service';
import { Oferta, OwnerAnalyticsSummary } from '../../../core/models/oferta.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { getSectorToneClass } from '../../../shared/utils/sector-tone';

@Component({
  selector: 'app-mis-ofertas',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './mis-ofertas.component.html',
  styleUrl: './mis-ofertas.component.css'
})
export class MisOfertasComponent implements OnInit {
  private ofertaService = inject(OfertaService);

  ofertas = signal<Oferta[]>([]);
  analyticsSummary = signal<OwnerAnalyticsSummary | null>(null);
  isLoading = signal<boolean>(true);
  page = signal<number>(1);
  pageSize = 8;
  pagination = signal<PaginationMeta | null>(null);

  ngOnInit() {
    this.cargarOfertas();
    this.cargarResumenAnalytics();
  }

  cargarOfertas() {
    this.isLoading.set(true);
    this.ofertaService.getMisOfertasPaged(this.page(), this.pageSize).subscribe({
      next: (result) => {
        this.ofertas.set(result.items);
        this.pagination.set(result.pagination);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error carregant les teves ofertes:', err);
        this.isLoading.set(false);
      }
    });
  }

  cargarResumenAnalytics() {
    this.ofertaService.getMisOfertasAnalyticsSummary().subscribe({
      next: (summary) => {
        this.analyticsSummary.set(summary);
      },
      error: (err) => {
        console.error('Error carregant resum analytics:', err);
      }
    });
  }

  formatRevenue(val?: string) {
    return formatRevenueRange(val);
  }

  formatEmployees(val?: string) {
    return formatEmployeeRange(val);
  }

  sectorToneClass(sector?: string): string {
    return getSectorToneClass(sector);
  }

  prevPage(): void {
    const meta = this.pagination();
    if (!meta?.hasPrevPage) return;
    this.page.set(meta.page - 1);
    this.cargarOfertas();
  }

  nextPage(): void {
    const meta = this.pagination();
    if (!meta?.hasNextPage) return;
    this.page.set(meta.page + 1);
    this.cargarOfertas();
  }
}
