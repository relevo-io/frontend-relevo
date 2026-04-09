import {
  Component,
  inject,
  input,
  output,
  effect,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Usuario } from '../../../../core/models/usuario.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.css',
})
export class UsuarioFormComponent {
  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);
  private ns = inject(NotificationService);

  // --- INPUTS / OUTPUTS ---
  // null = modo crear | Usuario = modo editar
  usuario = input<Usuario | null>(null);
  isOpen  = input<boolean>(false);
  saved   = output<Usuario>();   // Emite el usuario guardado al padre
  closed  = output<void>();      // Emite al cerrar sin guardar

  // --- ESTADO INTERNO ---
  isSaving = signal<boolean>(false);
  saveError = signal<string | null>(null);

  // --- FORMULARIO ---
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email:    ['', [Validators.required, Validators.email]],
    password: [''],   // Solo requerido en modo crear (validación dinámica)
    roles:    [['INTERESTED'] as Array<'OWNER' | 'INTERESTED' | 'ADMIN'>, Validators.required],
    location: [''],
    bio:      [''],
  });

  // Precarga los datos cuando cambia el input `usuario` (modo editar)
  constructor() {
    effect(() => {
      const u = this.usuario();
      if (u) {
        this.form.patchValue({
          fullName: u.fullName,
          email:    u.email,
          roles:    u.roles && u.roles.length ? u.roles : ['INTERESTED'],
          location: u.location ?? '',
          bio:      u.bio ?? '',
          password: '',
        });
        // En edición la contraseña es opcional
        this.form.get('password')?.clearValidators();
      } else {
        this.form.reset({ roles: ['INTERESTED'] });
        // En creación la contraseña es requerida
        this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      this.form.get('password')?.updateValueAndValidity();
      this.saveError.set(null);
    });
  }

  get modoCrear(): boolean { return !this.usuario(); }
  get titulo(): string { return this.modoCrear ? 'Añadir Usuario' : 'Editar Usuario'; }

  // Getters para acceso rápido en el template
  get f() { return this.form.controls; }

  cerrar(): void {
    this.form.reset({ roles: ['INTERESTED'] });
    this.closed.emit();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const payload = this.form.value as Partial<Usuario>;

    if (this.modoCrear) {
      this.usuarioService.createUsuario(payload as Omit<Usuario, '_id'>).subscribe({
        next: (nuevo) => {
          this.isSaving.set(false);
          this.ns.success('user created');
          this.saved.emit(nuevo);
          this.cerrar();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving.set(false);
          const errorBody = err.error;
          const serverErrors = errorBody.errors || errorBody.details;

          if (err.status === 400 && Array.isArray(serverErrors)) {
            serverErrors.forEach((e: { field: string, message: string }) => {
              this.form.get(e.field)?.setErrors({ serverError: e.message.toLowerCase() });
            });
            this.saveError.set('please check marked fields');
          } else if (err.status === 409) {
            const msg = (errorBody.message || 'already exists').toLowerCase();
            this.saveError.set(msg);
            
            if (msg.includes('email')) {
              this.form.get('email')?.setErrors({ serverError: 'email already in use' });
            }
          }
        },
      });
    } else {
      const id = this.usuario()!._id!;
      if (!payload.password) delete payload.password;
      
      this.usuarioService.updateUsuario(id, payload).subscribe({
        next: (actualizado) => {
          this.isSaving.set(false);
          this.ns.success('user updated');
          this.saved.emit(actualizado);
          this.cerrar();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving.set(false);
          const errorBody = err.error;
          const serverErrors = errorBody.errors || errorBody.details;

          if (err.status === 400 && Array.isArray(serverErrors)) {
            serverErrors.forEach((e: { field: string, message: string }) => {
              this.form.get(e.field)?.setErrors({ serverError: e.message.toLowerCase() });
            });
            this.saveError.set('validation failed');
          } else if (err.status === 409) {
            const msg = (errorBody.message || 'data already in use').toLowerCase();
            this.saveError.set(msg);
            
            if (msg.includes('email')) {
              this.form.get('email')?.setErrors({ serverError: 'email already exists' });
            }
          }
        },
      });
    }
  }
}
