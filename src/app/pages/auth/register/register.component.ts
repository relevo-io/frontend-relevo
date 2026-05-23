import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest } from '../../../core/models/auth.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private ns = inject(NotificationService);
  private themeService = inject(ThemeService);

  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['INTERESTED', Validators.required]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  get f() {
    return this.registerForm.controls;
  }

  togglePassword() {
    this.showPassword.update((val) => !val);
  }

  registerWithGoogle() {
    this.errorMessage.set(null);
    this.authService.loginWithGoogle().subscribe({
      next: () => this.router.navigate(['/']),
      error: (error) => {
        this.errorMessage.set(this.resolveSocialError(error, 'Google'));
      }
    });
  }

  registerWithGithub() {
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
    if (code === 'auth/popup-closed-by-user') return `Has cerrado la ventana de ${providerLabel} antes de completar el acceso.`;
    if (code === 'auth/account-exists-with-different-credential') {
      return 'Ya existe una cuenta con ese email usando otro metodo de acceso.';
    }

    return `No se pudo iniciar sesion con ${providerLabel}.`;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.registerForm.value;
    const requestData: RegisterRequest = {
      fullName: formValues.fullName,
      email: formValues.email,
      password: formValues.password,
      roles: formValues.role === 'OWNER' ? ['OWNER'] : ['INTERESTED'],
      theme: this.themeService.currentTheme(),
      language: this.translate.currentLang || this.translate.defaultLang || 'es'
    };

    this.authService.register(requestData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.ns.success(
          this.translate.instant('COMMON.NOTIF.REGISTER_SUCCESS') ||
            'Cuenta creada correctamente. Por favor, inicia sesión.'
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msgKey = err.error?.message || 'ERRORS.INTERNAL_ERROR';
        const translatedMsg = this.translate.instant(msgKey);
        this.errorMessage.set(translatedMsg);
      }
    });
  }
}
