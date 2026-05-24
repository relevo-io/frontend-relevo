import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  loginWithGoogle() {
    this.errorMessage.set(null);
    this.authService.loginWithGoogle().subscribe({
      next: () => this.router.navigate(['/']),
      error: (error) => {
        this.errorMessage.set(this.resolveSocialError(error, 'Google'));
      }
    });
  }

  loginWithGithub() {
    this.errorMessage.set(null);
    this.authService.loginWithGitHub().subscribe({
      next: () => this.router.navigate(['/']),
      error: (error) => {
        this.errorMessage.set(this.resolveSocialError(error, 'GitHub'));
      }
    });
  }

  private resolveSocialError(error: any, providerLabel: 'Google' | 'GitHub'): string {
    const backendMessage = error?.error?.message;
    if (backendMessage) return backendMessage;

    const code = error?.code as string | undefined;
    if (code === 'auth/popup-closed-by-user')
      return `Has cerrado la ventana de ${providerLabel} antes de completar el acceso.`;
    if (code === 'auth/account-exists-with-different-credential') {
      return 'Ya existe una cuenta con ese email usando otro metodo de acceso.';
    }

    return `No se pudo iniciar sesion con ${providerLabel}.`;
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msgKey = err.error?.message || 'ERRORS.INTERNAL_ERROR';
        this.errorMessage.set(this.translate.instant(msgKey));
      }
    });
  }
}
