import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MarketplaceSearchService } from '../../services/marketplace-search.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { ChatService } from '../../services/chat.service';
import { FcmService } from '../../services/fcm.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationPreferences } from '../../models/usuario.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FormsModule, LanguageSelectorComponent, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  public fcmService = inject(FcmService);
  private chatService = inject(ChatService);
  private toastService = inject(NotificationService);
  private router = inject(Router);
  private marketplaceSearchService = inject(MarketplaceSearchService);

  searchQuery = this.marketplaceSearchService.query;
  isMenuOpen = signal(false);
  unreadCount = signal(0);
  isNotificationModalOpen = signal(false);
  isDeactivateModalOpen = signal(false);
  isPreferencesModalOpen = signal(false);

  prefNewMessages = signal(true);
  prefApplicationStatus = signal(true);
  prefNewApplications = signal(true);
  prefCvAnalysis = signal(true);

  onBellClick(): void {
    const permission = this.fcmService.permissionState();
    const enabled = this.fcmService.notificationsEnabled();

    if (permission === 'default') {
      this.isNotificationModalOpen.set(true);
    } else if (permission === 'granted') {
      if (enabled) {
        // Cargar preferencias actuales del usuario
        const user = this.authService.currentUser();
        if (user && user.notificationPreferences) {
          this.prefNewMessages.set(user.notificationPreferences.newMessages !== false);
          this.prefApplicationStatus.set(user.notificationPreferences.applicationStatus !== false);
          this.prefNewApplications.set(user.notificationPreferences.newApplications !== false);
          this.prefCvAnalysis.set(user.notificationPreferences.cvAnalysis !== false);
        } else {
          this.prefNewMessages.set(true);
          this.prefApplicationStatus.set(true);
          this.prefNewApplications.set(true);
          this.prefCvAnalysis.set(true);
        }
        this.isPreferencesModalOpen.set(true);
      } else {
        this.activateNotifications();
      }
    } else if (permission === 'denied') {
      this.toastService.warn(
        'Has bloqueado las notificaciones. Actívalas haciendo clic en el icono del candado junto a la barra de direcciones de tu navegador.'
      );
    }
  }

  activateNotifications(): void {
    this.closeNotificationModal();
    this.closeDeactivateModal();
    this.closePreferencesModal();
    this.fcmService.requestNotificationPermission().then((permission) => {
      if (permission === 'granted') {
        this.toastService.success('¡Notificaciones activadas con éxito!');
        // Cargar preferencias actuales del usuario y abrir modal de ajustes inmediatamente
        const user = this.authService.currentUser();
        if (user && user.notificationPreferences) {
          this.prefNewMessages.set(user.notificationPreferences.newMessages !== false);
          this.prefApplicationStatus.set(user.notificationPreferences.applicationStatus !== false);
          this.prefNewApplications.set(user.notificationPreferences.newApplications !== false);
          this.prefCvAnalysis.set(user.notificationPreferences.cvAnalysis !== false);
        } else {
          this.prefNewMessages.set(true);
          this.prefApplicationStatus.set(true);
          this.prefNewApplications.set(true);
          this.prefCvAnalysis.set(true);
        }
        this.isPreferencesModalOpen.set(true);
      } else if (permission === 'denied') {
        this.toastService.warn('Permiso denegado.');
      }
    });
  }

  deactivateNotifications(): void {
    this.closeDeactivateModal();
    this.closePreferencesModal();
    this.fcmService.disableNotifications().then(() => {
      this.toastService.info('Notificaciones desactivadas en este navegador.');
    });
  }

  hasAllSelected(): boolean {
    return (
      this.prefNewMessages() && this.prefApplicationStatus() && this.prefNewApplications() && this.prefCvAnalysis()
    );
  }

  toggleSelectAll(): void {
    const targetState = !this.hasAllSelected();
    this.prefNewMessages.set(targetState);
    this.prefApplicationStatus.set(targetState);
    this.prefNewApplications.set(targetState);
    this.prefCvAnalysis.set(targetState);
  }

  savePreferences(): void {
    const prefs: NotificationPreferences = {
      newMessages: this.prefNewMessages(),
      applicationStatus: this.prefApplicationStatus(),
      newApplications: this.prefNewApplications(),
      cvAnalysis: this.prefCvAnalysis()
    };

    this.fcmService.updateNotificationPreferences(prefs).subscribe({
      next: (res) => {
        if (res.success && res.user) {
          const currentUser = this.authService.currentUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              notificationPreferences: res.user.notificationPreferences
            };
            this.authService.currentUser.set(updatedUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem('user_data', JSON.stringify(updatedUser));
            }
          }
          this.toastService.success('Ajustes de notificación actualizados');
        }
        this.closePreferencesModal();
      },
      error: (err) => {
        console.error('[Navbar] Error al guardar preferencias:', err);
        this.toastService.error('Error al guardar las preferencias.');
      }
    });
  }

  closeNotificationModal(): void {
    this.isNotificationModalOpen.set(false);
  }

  closeDeactivateModal(): void {
    this.isDeactivateModalOpen.set(false);
  }

  closePreferencesModal(): void {
    this.isPreferencesModalOpen.set(false);
  }

  getBellIcon(): string {
    const permission = this.fcmService.permissionState();
    const enabled = this.fcmService.notificationsEnabled();

    if (permission === 'granted' && enabled) return 'notifications_active';
    if (permission === 'denied') return 'notifications_off';
    return 'notifications';
  }

  constructor() {
    this.chatService.totalUnread$.subscribe((count) => this.unreadCount.set(count));
  }

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  onSearchInput(value: string): void {
    this.marketplaceSearchService.setQuery(value);
    if (!this.router.url.startsWith('/admin') && this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  goToSell(): void {
    this.router.navigate(['/ofertas/crear']);
  }

  getSessionActionLabel(): string {
    return this.authService.isAdmin() ? 'Dashboard' : 'Perfil';
  }

  getSessionActionRoute(): string {
    return this.authService.isAdmin() ? '/admin/dashboard' : '/perfil';
  }
}
