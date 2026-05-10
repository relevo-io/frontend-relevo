import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OfertaService } from '../../../core/services/oferta.service';
import { Oferta } from '../../../core/models/oferta.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';

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
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.cargarOfertas();
  }

  cargarOfertas() {
    this.isLoading.set(true);
    this.ofertaService.getMisOfertas().subscribe({
      next: (data) => {
        this.ofertas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error carregant les teves ofertes:', err);
        this.isLoading.set(false);
      }
    });
  }

  formatRevenue(val?: string) {
    return formatRevenueRange(val);
  }

  formatEmployees(val?: string) {
    return formatEmployeeRange(val);
  }
}
