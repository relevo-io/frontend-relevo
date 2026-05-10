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
    this.showPassword.update(val => !val);
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
        this.ns.success(this.translate.instant('COMMON.NOTIF.REGISTER_SUCCESS') || 'Cuenta creada correctamente. Por favor, inicia sesión.');
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
