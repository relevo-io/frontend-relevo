import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SolicitudService } from '../../../services/solicitud.service';
import { OfertaService } from '../../../services/oferta.service';
import { Solicitud } from '../../../models/solicitud.model';
import { Oferta } from '../../../models/oferta.model';
import { SearchInputComponent } from '../../shared/search-input/search-input.component';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-solicitudes-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchInputComponent],
  templateUrl: './solicitudes-list.html',
  styleUrl: './solicitudes-list.css',
})
export class SolicitudesComponent implements OnInit {
  private solicitudService = inject(SolicitudService);
  private ofertaService = inject(OfertaService);
  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);

  // Formulario de nueva solicitud
  solicitudForm: FormGroup = this.fb.group({
    interestedUserId: ['', Validators.required],
    opportunityId: ['', Validators.required],
    message: ['']
  });

  // Base data signals
  solicitudes = signal<Solicitud[]>([]);
  usuarios = signal<any[]>([]);
  ofertas = signal<Oferta[]>([]); // Para el select del formulario
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filter signals
  searchQuery = signal<string>('');
  estadoFilter = signal<string>('ALL'); // PENDING, ACCEPTED, REJECTED, ALL

  // SELECTION SIGNALS
  selectedIds = signal<Set<string>>(new Set());

  // COMPUTEDS
  isAllSelected = computed(() => {
    const visible = this.paginatedSolicitudes();
    if (visible.length === 0) return false;
    return visible.every(s => this.selectedIds().has(s._id!));
  });

  someSelected = computed(() => this.selectedIds().size > 0);

  filteredSolicitudes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.estadoFilter();
    const all = this.solicitudes();

    if (!query && filter === 'ALL') {
      return all;
    }

    return all.filter(s => {
      const matchesEstado = filter === 'ALL' || s.status === filter;
      const empresa = s.opportunity?.companyDescription?.toLowerCase() || '';
      const mensaje = s.message?.toLowerCase() || '';
      const email = s.interestedUser?.email?.toLowerCase() || '';
      
      const matchesSearch = !query || 
        empresa.includes(query) || 
        mensaje.includes(query) ||
        email.includes(query);

      return matchesEstado && matchesSearch;
    });
  });

  // PAGINACIÓN
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  paginatedSolicitudes = computed(() => {
    const all = this.filteredSolicitudes();
    const page = this.currentPage();
    const size = this.pageSize();
    return all.slice((page - 1) * size, page * size);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSolicitudes().length / this.pageSize()))
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: number[] = [1];
    if (current > 3) result.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 2) result.push(-1);
    result.push(total);
    return result;
  });

  ngOnInit(): void {
    this.fetchSolicitudes();
    this.fetchOfertas();
    this.fetchUsuarios();
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
        console.error('Error fetching solicitudes:', err);
        this.error.set('Error cargando solicitudes.');
        this.isLoading.set(false);
      }
    });
  }

  fetchOfertas(): void {
    this.ofertaService.getOfertas().subscribe({
      next: (data) => this.ofertas.set(data),
      error: (err) => console.error('Error fetching ofertas para el select:', err)
    });
  }

  fetchUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => this.usuarios.set(data),
      error: (err) => console.error('Error fetching usuarios:', err)
    });
  }

  // ENVIAR NUEVA SOLICITUD
  onSubmit(): void {
    if (this.solicitudForm.valid) {
      const formData = this.solicitudForm.value;
      
      this.solicitudService.crearSolicitud(formData).subscribe({
        next: (nuevaSolicitud) => {
          // Añadimos al principio de la lista actualizando el signal
          this.solicitudes.update(actuales => [nuevaSolicitud, ...actuales]);
          this.solicitudForm.reset({ opportunityId: '', message: '' });
        },
        error: (err) => {
          console.error('Error al crear solicitud:', err);
          alert('Hubo un error al enviar la solicitud');
        }
      });
    }
  }

  // ACCIONES DE LA TABLA (Aceptar / Rechazar)
  actualizarEstado(id: string, nuevoEstado: string): void {
    this.solicitudService.updateStatus(id, nuevoEstado).subscribe({
      next: (solicitudActualizada) => {
        this.solicitudes.update(actuales => 
          actuales.map(s => s._id === id ? { ...s, status: nuevoEstado } : s)
        );
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        alert('No se pudo actualizar el estado.');
      }
    });
  }

  // --- MÉTODOS DE BÚSQUEDA Y PAGINACIÓN ---
  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  updateEstadoFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.estadoFilter.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  pageStart(): number {
    if (this.filteredSolicitudes().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredSolicitudes().length);
  }

  // --- MÉTODOS DE SELECCIÓN ---
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

  eliminarSeleccionados() {
    const idsParaBorrar = Array.from(this.selectedIds()); // Obtenemos el array de IDs del Set

    if (idsParaBorrar.length === 0) return;

    if (confirm(`¿Estás seguro de que quieres eliminar ${idsParaBorrar.length} solicitudes?`)) {
      // Llamamos al servicio (asegúrate de que tu servicio tenga el método deleteMultiple)
      this.solicitudService.deleteMultiple(idsParaBorrar).subscribe({
        next: () => {
          // 1. Quitamos los elementos de la tabla localmente (Reactividad con Signals)
          this.solicitudes.update(list => 
            list.filter(s => !idsParaBorrar.includes(s._id))
          );
          
          // 2. Limpiamos la selección para que el overlay desaparezca
          this.clearSelection();
          
          console.log('Solicitudes borradas con éxito');
        },
        error: (err) => {
          alert('Error al borrar las solicitudes');
          console.error(err);
        }
      });
    }
  }

}