import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Interceptor funcional moderno para capturar errores HTTP de forma global.
 * Actúa antes de que el error llegue al componente.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const ns = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado';

      // 1. Filtrar por tipos de código (Contrato Backend)
      switch (error.status) {
        case 400:
          // Dejamos pasar errores de validación para manejo local en el form
          break;

        case 401:
          errorMessage = 'Sesión expirada. Por favor, inicia sesión de nuevo.';
          ns.error(errorMessage);
          // Aquí podríamos redirigir a /login
          break;

        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción.';
          ns.error(errorMessage);
          break;

        case 404:
          errorMessage = 'El recurso solicitado no existe.';
          ns.error(errorMessage);
          break;

        case 409:
          // Dejamos pasar conflictos (email duplicado) para el formulario
          break;

        case 500:
          errorMessage = 'Error interno en el servidor. Inténtalo más tarde.';
          ns.error(errorMessage);
          break;

        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          ns.error(errorMessage);
          break;
      }

      // Re-enviamos el error para que el componente también pueda reaccionar si quiere
      return throwError(() => error);
    })
  );
};
