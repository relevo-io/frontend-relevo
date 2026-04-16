import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

/**
 * Guarda que protege rutas privadas.
 * Solo deja pasar si el usuario está logueado (Usando Signals).
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // SSR: En el servidor no hay localStorage, dejamos pasar para que el navegador re-evalúe
  if (!authService.isBrowser) {
    return true;
  }

  // Paso 1: Si ya tiene sesión activa en memoria (Signal) → Adelante
  if (authService.isLoggedIn()) {
    return true;
  }

  // Paso 2: Si no hay Signal pero sí hay token (ej: F5 o caché borrada)
  // getToken() ya maneja internamente el isPlatformBrowser + localStorage
  const token = authService.getToken();
  if (token) {
    return authService.fetchProfile().pipe(
      map(() => true),
      catchError(() => {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }

  // Paso 3: Sin sesión ni token → Fuera
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
