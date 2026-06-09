import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip auth header for direct S3 uploads (pre-signed URLs already contain auth)
  const isS3Request = req.url.includes('amazonaws.com');

  let authReq = req;
  // Si hay token, clonamos la petición y añadimos el header Authorization
  if (token && !isS3Request) {
    authReq = addTokenHeader(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si recibimos un 401, intentamos refrescar el token
      // Evitamos interceptar la propia petición de login o de refresh para evitar bucles
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null); // Bloquemos las demás peticiones temporalmente

    return authService.refreshToken().pipe(
      switchMap((tokenResponse) => {
        isRefreshing = false;
        // Soltamos el nuevo token para cualquier petición en espera
        refreshTokenSubject.next(tokenResponse.accessToken);
        // Reintentamos la petición original que falló
        return next(addTokenHeader(request, tokenResponse.accessToken));
      }),
      catchError((err) => {
        // El refresh ha fallado
        isRefreshing = false;
        refreshTokenSubject.next(''); // Emitimos vacío para liberar las peticiones en cola

        // Solo deslogueamos si el error indica de forma explícita que las credenciales no son válidas (400, 401, 403)
        if (err && (err.status === 400 || err.status === 401 || err.status === 403)) {
          authService.logout();
        }
        return throwError(() => err);
      })
    );
  } else {
    // Si ya hay un refresco en progreso por culpa de otra petición paralela,
    // esperamos a que `refreshTokenSubject` emita un valor que no sea nulo.
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        if (token === '') {
          return throwError(() => new Error('Authentication/Session refresh failed'));
        }
        return next(addTokenHeader(request, token as string));
      })
    );
  }
}

function addTokenHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    headers: request.headers.set('Authorization', `Bearer ${token}`)
  });
}
