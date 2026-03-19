import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudService } from '../../../services/solicitud.service';
import { Solicitud } from '../../../models/solicitud.model';
import { SearchInputComponent } from '../../shared/search-input/search-input.component';

@Component({
  selector: 'app-solicitudes-list',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './solicitudes-list.html',
  styleUrl: './solicitudes-list.css',
})
export class SolicitudesList implements OnInit {
  private solicitudService = inject(SolicitudService);

  // --- BASE DATA SIGNALS ---
  solicitudes = signal<Solicitud[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // --- FILTER SIGNALS ---
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL'); // Filtro por estado: PENDING, ACCEPTED, REJECTED

  // --- SELECTION SIGNALS ---
  selectedIds = signal<Set<string>>(new Set());

  // --- PAGINACIÓN ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // --- COMPUTEDS ---

  // 1. Filtrado de solicitudes (por email del interesado, descripción de oferta o estado)
  filteredSolicitudes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    const all = this.solicitudes();

    return all.filter(s => {
      const matchesStatus = filter === 'ALL' || s.status === filter;
      
      // Buscamos en el email del interesado o en la descripción de la oportunidad
      const matchesSearch = !query || 
        s.interestedUser?.email.toLowerCase().includes(query) ||
        s.opportunity?.companyDescription.toLowerCase().includes(query) ||
        s.message?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  });

  // 2. Lógica de selección masiva
  isAllSelected = computed(() => {
    const visible = this.paginatedSolicitudes();
    if (visible.length === 0) return false;
    return visible.every(s => this.selectedIds().has(s._id!));
  });

  someSelected = computed(() => this.selectedIds().size > 0);

  // 3. Datos paginados finales
  paginatedSolicitudes = computed(() => {
    const all = this.filteredSolicitudes();
    const page = this.currentPage();
    const size = this.pageSize();
    return all.slice((page - 1) * size, page * size);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSolicitudes().length / this.pageSize()))
  );

  // --- MÉTODOS DE DATOS ---

  ngOnInit(): void {
    this.fetchSolicitudes();
  }

  fetchSolicitudes(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.solicitudService.getSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.error.set('Error cargando solicitudes.');
        this.isLoading.set(false);
      }
    });
  }

  cambiarEstado(id: string, nuevoEstado: 'ACCEPTED' | 'REJECTED'): void {
    this.solicitudService.updateStatus(id, nuevoEstado).subscribe({
      next: (actualizada) => {
        // Actualizamos localmente el signal para que la UI reaccione instantáneamente
        this.solicitudes.update(actuales => 
          actuales.map(s => s._id === id ? { ...s, status: nuevoEstado } : s)
        );
      },
      error: (err) => {
        console.error('Error updating status:', err);
        alert('No se pudo actualizar el estado.');
      }
    });
  }

  // --- MÉTODOS AUXILIARES (UI) ---

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  updateStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  toggleSelection(id: string): void {
    this.selectedIds.update(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    const allPageIds = this.paginatedSolicitudes().map(s => s._id!);
    this.selectedIds.update(prev => {
      if (this.isAllSelected()) {
        const next = new Set(prev);
        allPageIds.forEach(id => next.delete(id));
        return next;
      } else {
        return new Set([...prev, ...allPageIds]);
      }
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // Paginación simple
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  pageStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredSolicitudes().length);
  }
}


