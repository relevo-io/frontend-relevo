import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MarketplaceSearchService } from '../../services/marketplace-search.service';
import { SolicitudService } from '../../services/solicitud.service'; 
import { Solicitud } from '../../models/solicitud.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class Navbar implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private marketplaceSearchService = inject(MarketplaceSearchService);
  private solicitudService = inject(SolicitudService);

  searchQuery = this.marketplaceSearchService.query;

  pendingRequests = signal<Solicitud[]>([]);

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.cargarContador();
    }
  }

  cargarContador(): void {
    this.solicitudService.getMisSolicitudes().subscribe({
      next: (solicitudes) => {
        const pendientes = solicitudes.filter(s => s.status === 'PENDING');
        this.pendingRequests.set(pendientes);
      },
      error: (err) => console.error('Error cargando notificaciones', err)
    });
  }

  onSearchInput(value: string): void {
    this.marketplaceSearchService.setQuery(value);
    if (!this.router.url.startsWith('/admin') && this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  goToSell(): void {
    this.router.navigate(['/ofertas/crear']);
  }

  getSessionActionLabel(): string {
    return this.authService.isAdmin() ? 'Dashboard' : 'Perfil';
  }

  getSessionActionRoute(): string {
    return this.authService.isAdmin() ? '/admin/dashboard' : '/perfil';
  }
}

