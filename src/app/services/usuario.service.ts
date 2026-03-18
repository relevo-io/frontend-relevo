import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private http = inject(HttpClient);
  
  // Confirma que esta sea la ruta correcta de tu backend para los usuarios
  private apiUrl = 'http://localhost:4000/api/usuarios'; 

  // 1. Obtener la lista completa
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  // 2. Eliminar un usuario por su ID de MongoDB
  deleteUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // 3. Crear un usuario nuevo (POST)
  createUsuario(data: Omit<Usuario, '_id'>): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, data);
  }

  // 4. Actualizar un usuario existente (PUT)
  updateUsuario(id: string, data: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, data);
  }

  // 5. Borrado múltiple (DELETE con body)
  deleteUsuariosBatch(ids: string[]): Observable<any> {
    return this.http.request('delete', `${this.apiUrl}/batch`, {
      body: { ids }
    });
  }

  // 6. Cambiar visibilidad de un usuario (PATCH)
  updateUsuarioVisibility(id: string, visible: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}/visibility`, { visible });
  }

  // 7. Cambiar visibilidad de múltiples usuarios (PATCH con body)
  updateUsuariosVisibilityBatch(ids: string[], visible: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/batch/visibility`, { ids, visible });
  }
}
