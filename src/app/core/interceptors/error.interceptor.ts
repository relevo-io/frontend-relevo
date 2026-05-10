import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { ApiErrorResponse } from '../models/error.model';

/**
 * Interceptor funcional moderno para capturar errores HTTP de forma global.
 * Actúa antes de que el error llegue al componente y procesa el ApiErrorResponse estándar.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const ns = inject(NotificationService);
  const translate = inject(TranslateService);

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
          ns.error(translate.instant('ERRORS.VALIDATION_ERROR'));
          break;

        case 'UNAUTHORIZED':
          if (!req.url.includes('/auth/refresh')) {
             ns.error(translate.instant('ERRORS.AUTH.UNAUTHORIZED'));
          }
          break;

        case 'FORBIDDEN':
        case 'NOT_FOUND':
        case 'INTERNAL_ERROR':
        case 'CONFLICT':
          // Traducimos el mensaje que viene del backend (que ahora es una clave)
          ns.error(translate.instant(errorMessage));
          break;

        default:
          // Fallback final: intentamos traducir por si es una clave, si no mostramos el original
          const fallbackMsg = translate.instant(errorMessage || 'ERRORS.NETWORK_ERROR');
          ns.error(fallbackMsg);
          break;
      }

      // Re-enviamos el error completo (ahora el componente podrá leer el apiError.details)
      return throwError(() => response);
    })
  );
};
