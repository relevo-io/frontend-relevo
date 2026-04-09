import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // Quitamos AsyncPipe
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class Navbar {
  public authService = inject(AuthService);

  // Mock de inicio rápido (solo para testing si no quieres usar el form)
  loginRapido() {
    this.authService.login({ email: 'test@relevo.io', password: 'password' }).subscribe();
  }
}