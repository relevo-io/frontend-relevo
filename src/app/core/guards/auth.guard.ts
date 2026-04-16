import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor (SSR), dejamos pasar porque allí no hay localStorage.
  // El navegador hará su propia pasada una vez cargue y ahí sí echará al usuario si toca.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return true;
  }

  // Si no está logueado en memoria, comprobar si tiene token (Caché borrada)
  const token = localStorage.getItem('access_token');
  if (token) {
    // Congelamos la pantalla hasta que el Backend nos conteste quién es
    return authService.fetchProfile().pipe(
      map(() => true),
      catchError(() => {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }

  // Redirigir al login si no está autenticado en absoluto
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

