import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';
import { SearchInputComponent } from '../../shared/search-input/search-input.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private usuarioService = inject(UsuarioService);
  
  // Base data signals
  usuarios = signal<Usuario[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Filter signals
  searchQuery = signal<string>('');
  roleFilter = signal<string>('ALL');

  // LA MAGIA: El Computed Signal que gestiona el Filtrado y Ranking (Relaciones Fuertes)
  filteredUsuarios = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.roleFilter();
    const allUsers = this.usuarios();

    if (!query && filter === 'ALL') {
      return allUsers; // No hay filtros activos
    }

    return allUsers
      .filter(u => {
        const matchesRole = filter === 'ALL' || u.role === filter;
        const matchesSearch = !query || 
          u.fullName.toLowerCase().includes(query) || 
          u.email.toLowerCase().includes(query);
        
        return matchesRole && matchesSearch;
      })
      .sort((a, b) => {
        if (!query) return 0;

        // --- SISTEMA DE RANKING (Relaciones Fuertes) ---
        // 1. Prioridad: El nombre empieza exactamente por la búsqueda
        const aStarts = a.fullName.toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = b.fullName.toLowerCase().startsWith(query) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        // 2. Prioridad: La búsqueda está en el nombre (aunque no al inicio)
        const aInName = a.fullName.toLowerCase().includes(query) ? 1 : 0;
        const bInName = b.fullName.toLowerCase().includes(query) ? 1 : 0;
        if (aInName !== bInName) return bInName - aInName;

        return 0; // Mantener orden original (Mongo) para el resto
      });
  });

  ngOnInit(): void {
    this.fetchUsuarios();
  }

  fetchUsuarios(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.error.set('Error cargando usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  // Métodos de actualización de filtros
  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateRole(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleFilter.set(value);
  }
}
