import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models/usuario.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  usuario = signal<Usuario | null>(null);
  isEditing = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);

  profileForm: FormGroup = this.fb.group({
    location: [''],
    bio: [''],
    professionalBackground: ['']
  });

  ngOnInit() {
    this.cargarMiPerfil();
  }

  cargarMiPerfil() {
    const cachedUser = this.authService.currentUser();
    if (!cachedUser?._id) return;

    this.usuarioService.getUsuario(cachedUser._id).subscribe({
      next: (data) => {
        this.usuario.set(data);
        this.profileForm.patchValue({
          location: data.location || '',
          bio: data.bio || '',
          professionalBackground: data.professionalBackground || ''
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
  }

  guardarPerfil() {
    const current = this.usuario();
    if (!current?._id) return;

    this.isSaving.set(true);
    const formVals = this.profileForm.value;

    this.usuarioService.updateUsuario(current._id, formVals).subscribe({
      next: (actualizado) => {
        this.usuario.set(actualizado);
        this.isEditing.set(false);
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isSaving.set(false);
      }
    });
  }

}