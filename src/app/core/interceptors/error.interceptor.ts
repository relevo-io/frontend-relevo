import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { ApiErrorResponse } from '../models/error.model';

/**
 * Interceptor funcional moderno para capturar errores HTTP de forma global.
 * Actúa antes de que el error llegue al componente y procesa el ApiErrorResponse estándar.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const ns = inject(NotificationService);

  return next(req).pipe(
    catchError((response: HttpErrorResponse) => {
      // El backend ahora devuelve de forma estricta un ApiErrorResponse
      const apiError = response.error as ApiErrorResponse;
      let errorMessage = 'Ha ocurrido un error inesperado de red';

      if (apiError && apiError.message) {
        errorMessage = apiError.message;
      }

      // 1. Filtrar por tipo de error
      switch (apiError?.errorCode || 'UNKNOWN_ERROR') {
        case 'VALIDATION_ERROR':
          // Dejamos pasar errores de validación para manejo local en el form
          // O mandamos un log genérico
          ns.error('Por favor, revisa los datos del formulario');
          break;

        case 'UNAUTHORIZED':
          // El auth interceptor ya maneja el logout real, aquí solo avisamos
          if (!req.url.includes('/auth/refresh')) {
             ns.error('Sesión terminada o credenciales incorrectas');
          }
          break;

        case 'FORBIDDEN':
        case 'NOT_FOUND':
        case 'INTERNAL_ERROR':
          ns.error(errorMessage);
          break;

        default:
          // Fallback final
          ns.error(errorMessage);
          break;
      }

      // Re-enviamos el error completo (ahora el componente podrá leer el apiError.details)
      return throwError(() => response);
    })
  );
};
