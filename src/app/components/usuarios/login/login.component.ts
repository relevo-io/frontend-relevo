import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class Login {
  private router = inject(Router);
  private authService = inject(AuthService);

  iniciarSesion(event: Event) {
    event.preventDefault(); 
    this.authService.login();
    this.router.navigate(['/oportunidades']);
  }
}
