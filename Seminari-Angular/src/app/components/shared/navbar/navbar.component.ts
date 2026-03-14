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

  // Variable para controlar el popup
  mostrarModal = false;

  abrirModal() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  iniciarSesion(event: Event) {
    event.preventDefault(); // Evita que recargue la página
    this.authService.login(); // Avisa que estamos logueados
    this.cerrarModal(); // Cierra el popup
    this.router.navigate(['/oportunidades']); // Asegura que estemos en oportunidades
  }
}