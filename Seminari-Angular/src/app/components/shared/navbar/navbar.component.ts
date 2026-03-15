import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router} from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class Navbar {
  public authService = inject(AuthService);
  private router = inject(Router);

// Función directa para entrar sin formulario
  loginRapido() {
    this.authService.login();
    this.router.navigate(['/oportunidades']);
  }
}