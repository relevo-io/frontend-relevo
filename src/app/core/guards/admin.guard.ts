import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guarda que protege el Panel de Admin.
 * Solo deja pasar si el usuario tiene el rol 'ADMIN'.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  // Si no es admin, lo mandamos a la home
  router.navigate(['/']);
  return false;
};
