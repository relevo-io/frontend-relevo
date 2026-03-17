import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
private http = inject(HttpClient);
  
  // Confirma que esta sea la ruta correcta de tu backend para los usuarios
  private apiUrl = 'http://localhost:4000/api/usuarios'; 

  constructor() { }

  // Hacemos la petición GET a MongoDB
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }
}
