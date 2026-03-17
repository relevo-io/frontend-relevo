import { Component, inject, OnInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model'; 

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.css'
})
export class UsuariosListComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private cdr = inject(ChangeDetectorRef);
  
  usuarios: Usuario[] = [];

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usuarioService.getUsuarios().subscribe({
      next: (datosDelServidor) => {
        this.usuarios = datosDelServidor;
        console.log('¡Usuarios recibidos de Mongo!', this.usuarios);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al conectar con el backend:', error);
      }
    });
  }
}