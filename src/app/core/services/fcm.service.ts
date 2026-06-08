import { Injectable, inject, effect, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import type { Messaging, MessagePayload } from 'firebase/messaging';
import { NotificationPreferences } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(NotificationService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private messaging: Messaging | null = null;
  private currentToken: string | null = null;

  // Señal reactiva que contiene el estado de los permisos de notificación
  public permissionState = signal<NotificationPermission>('default');

  // Señal reactiva para saber si el usuario ha habilitado o deshabilitado las notificaciones
  public notificationsEnabled = signal<boolean>(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        this.permissionState.set(Notification.permission);
      }

      // Cargar preferencia de notificaciones del localStorage
      const enabledPref = localStorage.getItem('fcm_enabled');
      if (enabledPref === 'false') {
        this.notificationsEnabled.set(false);
      }

      // Escuchar eventos de navegación provenientes del Service Worker (una sola vez)
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NAVIGATE') {
            this.router.navigateByUrl(event.data.url);
          }
        });
      }

      // Reaccionamos de forma reactiva al estado de login del usuario
      effect(() => {
        const loggedIn = this.authService.isLoggedIn();
        if (loggedIn) {
          this.initFCM();
        } else {
          this.cleanFCM();
        }
      });
    }
  }

  /**
   * Inicializa Firebase Cloud Messaging (FCM)
   */
  private async initFCM(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[FCM] Los Service Workers no estan soportados en este navegador.');
      return;
    }

    try {
      // Carga dinámica de módulos de Firebase para optimizar el bundle inicial de Angular
      const [{ initializeApp, getApps, getApp }, { getMessaging, onMessage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging')
      ]);

      // Reusar la app de autenticación si ya existe para evitar errores de inicialización repetida
      const app = getApps().find((a) => a.name === 'relevo-firebase-auth')
        ? getApp('relevo-firebase-auth')
        : getApps().length > 0
          ? getApps()[0]!
          : initializeApp(environment.firebase);

      this.messaging = getMessaging(app);
      if (!this.messaging) {
        console.warn('[FCM] No se pudo obtener la instancia de Messaging.');
        return;
      }

      // Registrar y esperar el Service Worker de FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      if (typeof window !== 'undefined' && 'Notification' in window) {
        this.permissionState.set(Notification.permission);
      }

      // Si el permiso ya está concedido y el usuario las quiere activar, adquirimos el token automáticamente
      const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
      if (hasNotificationSupport && Notification.permission === 'granted' && this.notificationsEnabled()) {
        await this.acquireToken(registration);
      }

      // Escuchar mensajes recibidos en Primer Plano (Foreground)
      onMessage(this.messaging, (payload: MessagePayload) => {
        // Evitar mostrar la notificación de toast si el usuario ya está viendo ese mismo chat
        const notificationChatId = payload.data?.['chatId'];
        const currentUrl = this.router.url;
        if (notificationChatId && currentUrl.includes(`/chats/${notificationChatId}`)) {
          return;
        }

        if (payload.notification) {
          const title = payload.notification.title || 'Notificacion';
          const body = payload.notification.body || '';
          this.toastService.info(`${title}: ${body}`);
        }
      });
    } catch (error) {
      console.error('[FCM] Error al inicializar Firebase Cloud Messaging:', error);
    }
  }

  /**
   * Solicita el permiso de notificaciones de forma manual iniciada por el usuario
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      return 'default';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState.set(permission);

      if (permission === 'granted') {
        this.notificationsEnabled.set(true);
        localStorage.setItem('fcm_enabled', 'true');

        if (this.messaging) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await this.acquireToken(registration);
          } else {
            const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            await this.acquireToken(newReg);
          }
        }
      }
      return permission;
    } catch (error) {
      console.error('[FCM] Error al solicitar permiso de notificaciones:', error);
      return 'default';
    }
  }

  /**
   * Desactiva temporalmente las notificaciones (limpia tokens y apaga bandera)
   */
  public async disableNotifications(): Promise<void> {
    this.notificationsEnabled.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('fcm_enabled', 'false');
    }
    await this.cleanFCM();
  }

  /**
   * Adquiere el token FCM de Firebase y lo envía al backend
   */
  private async acquireToken(registration: ServiceWorkerRegistration): Promise<void> {
    if (!this.messaging) {
      console.warn('[FCM] No se puede adquirir el token: Firebase Messaging no está inicializado.');
      return;
    }
    try {
      const { getToken } = await import('firebase/messaging');
      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: registration
      });

      if (token) {
        this.currentToken = token;
        this.saveTokenToBackend(token);
      } else {
        console.warn('[FCM] No se pudo obtener el token de registro de FCM.');
      }
    } catch (error) {
      console.error('[FCM] Error al adquirir token de FCM:', error);
    }
  }

  /**
   * Guarda el token de registro en la base de datos
   */
  private saveTokenToBackend(token: string): void {
    const url = `${environment.apiUrl}/api/usuarios/fcm-token`;
    this.http.post(url, { token }).subscribe({
      error: (err) => console.error('[FCM] Error al registrar token en el backend:', err)
    });
  }

  /**
   * Elimina el token del backend e invalida el token FCM local
   */
  private async cleanFCM(): Promise<void> {
    if (!this.currentToken) return;

    const tokenToDelete = this.currentToken;
    this.currentToken = null;

    const url = `${environment.apiUrl}/api/usuarios/fcm-token/${tokenToDelete}`;
    this.http.delete(url).subscribe({
      error: (err) => console.error('[FCM] Error al remover token del backend:', err)
    });

    if (this.messaging) {
      try {
        const { deleteToken } = await import('firebase/messaging');
        await deleteToken(this.messaging);
      } catch (err) {
        console.error('[FCM] Error al invalidar token en Firebase SDK:', err);
      }
    }
  }

  public updateNotificationPreferences(prefs: NotificationPreferences) {
    const url = `${environment.apiUrl}/api/usuarios/me/notification-preferences`;
    return this.http.patch<{ success: boolean; user: any }>(url, prefs);
  }
}
