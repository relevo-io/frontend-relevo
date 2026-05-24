import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OfertaService } from '../../../core/services/oferta.service';
import { Oferta } from '../../../core/models/oferta.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
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

  ngOnInit(): void {
    this.cargarFavoritas();
  }

  cargarFavoritas(): void {
    this.isLoading.set(true);
    this.ofertaService.getMisFavoritas().subscribe({
      next: (data) => {
        this.favoritas.set(data);
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
        this.favoritas.set(this.favoritas().filter((oferta) => oferta._id !== ofertaId));
      }
    });
  }

  formatRevenue(value?: string): string {
    return formatRevenueRange(value);
  }

  formatEmployees(value?: string): string {
    return formatEmployeeRange(value);
  }
}
