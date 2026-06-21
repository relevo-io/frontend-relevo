import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertaService } from '../../../core/services/alerta.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertaOferta, AlertaMatchedOffer } from '../../../core/models/alerta.model';
import { Oferta } from '../../../core/models/oferta.model';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';

@Component({
  selector: 'app-admin-alertas',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './admin-alertas.component.html',
  styleUrl: './admin-alertas.component.css'
})
export class AdminAlertasComponent implements OnInit {
  private alertaService = inject(AlertaService);
  private confirmService = inject(ConfirmDialogService);
  private toast = inject(NotificationService);

  alertas = signal<AlertaOferta[]>([]);
  isLoading = signal(true);
  isRefreshing = signal(false);
  error = signal<string | null>(null);

  searchQuery = signal('');
  regionFilter = signal('ALL');
  employeeRangeFilter = signal('ALL');
  revenueRangeFilter = signal('ALL');
  expandedAlertId = signal<string | null>(null);

  filteredAlertas = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const region = this.regionFilter();
    const employeeRange = this.employeeRangeFilter();
    const revenueRange = this.revenueRangeFilter();

    return this.alertas().filter((alerta) => {
      const matchesName = !query || (alerta.name ?? '').toLowerCase().includes(query);
      const matchesRegion = region === 'ALL' || (alerta.region ?? 'No definida') === region;
      const matchesEmployeeRange = employeeRange === 'ALL' || (alerta.employeeRange ?? 'No definido') === employeeRange;
      const matchesRevenueRange = revenueRange === 'ALL' || (alerta.revenueRange ?? 'No definido') === revenueRange;
      return matchesName && matchesRegion && matchesEmployeeRange && matchesRevenueRange;
    });
  });

  regions = computed(() => this.buildOptions(this.alertas().map((alerta) => alerta.region || 'No definida')));
  employeeRanges = computed(() =>
    this.buildOptions(this.alertas().map((alerta) => alerta.employeeRange || 'No definido'))
  );
  revenueRanges = computed(() =>
    this.buildOptions(this.alertas().map((alerta) => alerta.revenueRange || 'No definido'))
  );

  ngOnInit(): void {
    this.fetchAlertas();
  }

  fetchAlertas(): void {
    this.error.set(null);
    this.isLoading.set(!this.isRefreshing());

    this.alertaService.getAlertas().subscribe({
      next: (alertas) => {
        this.alertas.set(alertas);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Error loading alerts', err);
        this.error.set('No se pudieron cargar las alertas guardadas.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  refresh(): void {
    this.isRefreshing.set(true);
    this.fetchAlertas();
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateFilter(signalSetter: typeof this.regionFilter, event: Event): void {
    signalSetter.set((event.target as HTMLSelectElement).value);
  }

  toggleExpanded(alertId?: string): void {
    if (!alertId) return;
    this.expandedAlertId.set(this.expandedAlertId() === alertId ? null : alertId);
  }

  async deleteAlerta(alerta: AlertaOferta): Promise<void> {
    if (!alerta._id) return;

    const confirmed = await this.confirmService.ask(
      'Eliminar alerta',
      `Se eliminara la alerta "${alerta.name || 'Sin nombre'}".`,
      'Eliminar'
    );

    if (!confirmed) return;

    this.alertaService.deleteAlerta(alerta._id).subscribe({
      next: () => {
        this.alertas.update((current) => current.filter((item) => item._id !== alerta._id));
        if (this.expandedAlertId() === alerta._id) {
          this.expandedAlertId.set(null);
        }
        this.toast.success('Alerta eliminada');
      },
      error: (err) => {
        console.error('Error deleting alert', err);
        this.toast.error('No se pudo eliminar la alerta');
      }
    });
  }

  getMatchCount(alerta: AlertaOferta): number {
    return alerta.matchedOffers?.length ?? 0;
  }

  getLastMatch(alerta: AlertaOferta): string | null {
    const matches = alerta.matchedOffers ?? [];
    if (matches.length === 0) return null;
    const sorted = [...matches].sort((a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime());
    return sorted[0]?.matchedAt ?? null;
  }

  getOfferLabel(match: AlertaMatchedOffer): string {
    const offer = match.offerId;
    if (typeof offer === 'string') {
      return offer;
    }

    return [offer.companyDescription, offer.sector, offer.region].filter(Boolean).join(' - ') || offer._id || 'Oferta';
  }

  private buildOptions(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }
}
