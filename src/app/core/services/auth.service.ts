import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { from, Observable, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import {
  AuthResponse,
  FirebaseLoginRequest,
  LoginRequest,
  OAuthLoginRequest,
  OAuthProvider,
  RegisterRequest
} from '../models/auth.model';
import { Usuario } from '../models/usuario.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/api`;

  // --- SIGNALS ---
  public currentUser = signal<Usuario | null>(null);
  public isLoggedIn = computed(() => !!this.currentUser());
  public isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') ?? false);
  public isOwner = computed(() => this.currentUser()?.roles?.includes('OWNER') ?? false);
  public isInterested = computed(() => this.currentUser()?.roles?.includes('INTERESTED') ?? false);
  public isPro = computed(() => this.currentUser()?.proActive ?? false);
  public isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    // Si estamos en el navegador, leemos la caché al instante, sin esperar al siguiente render
    if (this.isBrowser) {
      this.checkToken();
    }
  }

  private checkToken() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');

    // 1. Cargar caché inmediatamente si existe para no bloquear UI
    if (token && userData) {
      try {
        this.currentUser.set(JSON.parse(userData));
      } catch (_e) {
        // Fallará la caché pero fetchProfile lo arregla
      }
    }

    // 2. Background Sync
    if (token) {
      this.fetchProfile().subscribe({
        error: (err) => {
          // Si el Backend rechaza el JWT (ej: expirado o inválido), limpiamos la sesión
          // Omitimos desloguear si es un problema de red (status 0) o error de servidor (500)
          if (err && (err.status === 401 || err.status === 403 || err.status === 404)) {
            this.logout();
          }
        }
      });
    }
  }

  fetchProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
      tap((usuario) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user_data', JSON.stringify(usuario));
          this.currentUser.set(usuario);
        }
      })
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true }).pipe(
      tap((res) => {
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

  loginWithFirebaseProvider(provider: OAuthProvider): Observable<AuthResponse> {
    if (!this.isBrowser) {
      throw new Error('Firebase login solo disponible en navegador');
    }

    const firebaseLoginPromise = (async () => {
      const [{ getApp, getApps, initializeApp }, firebaseAuthModule] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth')
      ]);

      const app = getApps().find((item) => item.name === 'relevo-firebase-auth')
        ? getApp('relevo-firebase-auth')
        : initializeApp(environment.firebase, 'relevo-firebase-auth');
      const auth = firebaseAuthModule.getAuth(app);
      const authProvider =
        provider === 'google'
          ? new firebaseAuthModule.GoogleAuthProvider()
          : new firebaseAuthModule.GithubAuthProvider();

      if (provider === 'github') {
        authProvider.addScope('read:user');
        authProvider.addScope('user:email');
      }

      const credential = await firebaseAuthModule.signInWithPopup(auth, authProvider);
      const idToken = await credential.user.getIdToken(true);
      const providerAccessToken =
        provider === 'github'
          ? firebaseAuthModule.GithubAuthProvider.credentialFromResult(credential)?.accessToken
          : undefined;

      return { idToken, providerAccessToken };
    })();

    return from(firebaseLoginPromise).pipe(
      switchMap(({ idToken, providerAccessToken }) => {
        const body: FirebaseLoginRequest = { idToken, providerAccessToken };
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/firebase`, body, { withCredentials: true });
      }),
      tap((res) => {
        if (res.accessToken && res.usuario && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.accessToken);
          localStorage.setItem('user_data', JSON.stringify(res.usuario));
          this.currentUser.set(res.usuario);
        }
      })
    );
  }

  loginWithGoogle(): Observable<AuthResponse> {
    return this.loginWithFirebaseProvider('google');
  }

  loginWithGitHub(): Observable<AuthResponse> {
    return this.loginWithFirebaseProvider('github');
  }

  // Compatibilidad temporal con el callback OAuth existente.
  completeOAuthLogin(provider: OAuthProvider, payload: OAuthLoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/oauth/${provider}`, payload, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.accessToken && res.usuario && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('access_token', res.accessToken);
            localStorage.setItem('user_data', JSON.stringify(res.usuario));
            this.currentUser.set(res.usuario);
          }
        })
      );
  }

  refreshToken(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.accessToken && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.accessToken);
        }
      })
    );
  }

  logout() {
    import('firebase/auth')
      .then(async (firebaseAuthModule) => {
        const auth = firebaseAuthModule.getAuth();
        await firebaseAuthModule.signOut(auth);
      })
      .catch(() => undefined);
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
