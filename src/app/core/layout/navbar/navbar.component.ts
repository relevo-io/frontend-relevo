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

  onBellClick(): void {
    const permission = this.fcmService.permissionState();
    const enabled = this.fcmService.notificationsEnabled();

    if (permission === 'default') {
      this.isNotificationModalOpen.set(true);
    } else if (permission === 'granted') {
      if (enabled) {
        this.isDeactivateModalOpen.set(true);
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
    this.fcmService.requestNotificationPermission().then((permission) => {
      if (permission === 'granted') {
        this.toastService.success('¡Notificaciones activadas con éxito!');
      } else if (permission === 'denied') {
        this.toastService.warn('Permiso denegado.');
      }
    });
  }

  deactivateNotifications(): void {
    this.closeDeactivateModal();
    this.fcmService.disableNotifications().then(() => {
      this.toastService.info('Notificaciones desactivadas en este navegador.');
    });
  }

  closeNotificationModal(): void {
    this.isNotificationModalOpen.set(false);
  }

  closeDeactivateModal(): void {
    this.isDeactivateModalOpen.set(false);
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
