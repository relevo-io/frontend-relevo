import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organizacion } from '../models/organizacion.model';
import { environment } from '../../environments/environment';



@Injectable({
  providedIn: 'root',
})
export class OrganizacionService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  //Función: obtener organizaciones de la API
  getOrganizaciones(): Observable<Organizacion[]> {
    return this.http.get<Organizacion[]>(
      `${this.baseUrl}/organizaciones`
    );
  }

  //Función: obtener una organización por su ID
  getOrganizacionById(id: string): Observable<Organizacion> {
    return this.http.get<Organizacion>(
      `${this.baseUrl}/organizaciones/${id}`
    );
  }

  //Función: crear nueva organización
  createOrganizacion(name: string): Observable<Organizacion> {
    return this.http.post<Organizacion>(
      `${this.baseUrl}/organizaciones`,
      { name }
    );
  }

  //Función: actualizar organización existente
  updateOrganizacion(id: string, name: string): Observable<Organizacion> {
    return this.http.put<Organizacion>(
      `${this.baseUrl}/organizaciones/${id}`,
      { name }
    );
  }

  //Función: eliminar organización
  deleteOrganizacion(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/organizaciones/${id}`
    );
  }
}
