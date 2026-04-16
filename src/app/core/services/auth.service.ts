import { Injectable, inject, signal, computed, PLATFORM_ID, afterNextRender } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = 'http://localhost:4000/api';

  // --- SIGNALS ---
  public currentUser = signal<Usuario | null>(null);
  public isLoggedIn = computed(() => !!this.currentUser());
  public isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') ?? false);

  constructor() {
    afterNextRender(() => {
      this.checkToken();
    });
  }

  private checkToken() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');

    // 1. Cargar caché inmediatamente si existe para no bloquear UI
    if (token && userData) {
      try {
        this.currentUser.set(JSON.parse(userData));
      } catch (e) {
        // Fallará la caché pero fetchProfile lo arregla
      }
    }

    // 2. Background Sync 
    if (token) {
      this.fetchProfile().subscribe({
        error: () => {
          // Si el Backend rechaza el JWT (ej: expirado), limpiamos la sesión
          this.logout();
        }
      });
    }
  }

  fetchProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
      tap(usuario => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user_data', JSON.stringify(usuario));
          this.currentUser.set(usuario);
        }
      })
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (res.accessToken && res.usuario && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.accessToken);
          localStorage.setItem('user_data', JSON.stringify(res.usuario));
          this.currentUser.set(res.usuario);
        }
      })
    );
  }




  register(userData: RegisterRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, userData);
  }

  refreshToken(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(res => {
        if (res.accessToken && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.accessToken);
        }
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
    }
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('access_token');
    }
    return null;
  }
}