import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth.model';
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
    if (isPlatformBrowser(this.platformId)) {
      this.checkToken();
    }
  }

  private checkToken() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        this.currentUser.set(JSON.parse(userData));
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: { email: string, password: string }): Observable<AuthResponse> {
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




  register(userData: Partial<Usuario>): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, userData);
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