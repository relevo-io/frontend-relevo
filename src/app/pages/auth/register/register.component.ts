import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['INTERESTED', Validators.required]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

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
    const requestData = {
      fullName: formValues.fullName,
      email: formValues.email,
      password: formValues.password,
      roles: [formValues.role]
    };

    this.authService.register(requestData).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Després de registrar, els portem al login perquè entrin.
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error en el registro. Este email ya podría estar en uso.');
      }
    });
  }
}
