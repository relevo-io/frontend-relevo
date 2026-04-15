import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);

  // --- UI SIGNALS ---
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // --- FORM ---
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        this.router.navigate(['/']);
      },

      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error de autenticación. Verifica tus credenciales.');
      }
    });
  }
}

