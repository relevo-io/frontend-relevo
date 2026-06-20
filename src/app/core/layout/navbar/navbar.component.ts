import { Component, inject, signal, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MarketplaceSearchService } from '../../services/marketplace-search.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { ChatService } from '../../services/chat.service';
import { FcmService } from '../../services/fcm.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationPreferences } from '../../models/usuario.model';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { NotificationHistory } from '../../models/notification.model';
import { AlertaService } from '../../services/alerta.service';
import { AlertaOferta } from '../../models/alerta.model';
import { Oferta } from '../../models/oferta.model';
import { formatEmployeeRange, formatRevenueRange } from '../../../shared/utils/oferta-formatters';
import { OnboardingService } from '../../services/onboarding.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FormsModule, LanguageSelectorComponent, TranslateModule, DatePipe],
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
  private translate = inject(TranslateService);
  private notificationHistoryService = inject(NotificationHistoryService);
  private alertaService = inject(AlertaService);
  private onboardingService = inject(OnboardingService);

  searchQuery = this.marketplaceSearchService.query;
  isMenuOpen = signal(false);
  unreadCount = signal(0);
  isNotificationModalOpen = signal(false);
  isDeactivateModalOpen = signal(false);
  isPreferencesModalOpen = signal(false);
  isHelpModalOpen = signal(false);

  // Historial de notificaciones
  isHistoryOpen = signal(false);
  notifications = signal<NotificationHistory[]>([]);
  unreadNotifCount = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  hasMore = signal(false);
  isLoadingNotifications = signal(false);

  prefNewMessages = signal(true);
  prefApplicationStatus = signal(true);
  prefNewApplications = signal(true);
  prefCvAnalysis = signal(true);
  prefOfferAlerts = signal(true);

  offerAlerts = signal<AlertaOferta[]>([]);
  isLoadingOfferAlerts = signal(false);
  isSavingOfferAlert = signal(false);
  alertName = signal('');
  alertRegion = signal('');
  alertRevenueRange = signal('');
  alertEmployeeRange = signal('');

  revenueRangeOptions = ['UNDER_100K', 'BETWEEN_100K_500K', 'BETWEEN_500K_1M', 'BETWEEN_1M_5M', 'OVER_5M'];
  employeeRangeOptions = ['1_5', '6_10', '11_25', '26_50', '51_100', '100_PLUS'];
  faqItems = [
    {
      question: 'HELP.FAQ_1_Q',
      answer: 'HELP.FAQ_1_A'
    },
    {
      question: 'HELP.FAQ_2_Q',
      answer: 'HELP.FAQ_2_A'
    },
    {
      question: 'HELP.FAQ_3_Q',
      answer: 'HELP.FAQ_3_A'
    },
    {
      question: 'HELP.FAQ_4_Q',
      answer: 'HELP.FAQ_4_A'
    },
    {
      question: 'HELP.FAQ_5_Q',
      answer: 'HELP.FAQ_5_A'
    }
  ];

  private syncPreferenceSignals(): void {
    const user = this.authService.currentUser();
    if (user && user.notificationPreferences) {
      this.prefNewMessages.set(user.notificationPreferences.newMessages !== false);
      this.prefApplicationStatus.set(user.notificationPreferences.applicationStatus !== false);
      this.prefNewApplications.set(user.notificationPreferences.newApplications !== false);
      this.prefCvAnalysis.set(user.notificationPreferences.cvAnalysis !== false);
      this.prefOfferAlerts.set(user.notificationPreferences.offerAlerts !== false);
      return;
    }

    this.prefNewMessages.set(true);
    this.prefApplicationStatus.set(true);
    this.prefNewApplications.set(true);
    this.prefCvAnalysis.set(true);
    this.prefOfferAlerts.set(true);
  }

  onBellClick(): void {
    const permission = this.fcmService.syncPermissionState();
    const enabled = this.fcmService.notificationsEnabled();

    if (permission === 'default') {
      this.isNotificationModalOpen.set(true);
    } else if (permission === 'granted') {
      if (enabled) {
        this.toggleHistory();
      } else {
        this.activateNotifications();
      }
    } else if (permission === 'denied') {
      this.toastService.warn(this.translate.instant('NOTIFICATIONS.TOAST_BLOCKED'));
    }
  }

  activateNotifications(): void {
    this.closeNotificationModal();
    this.closeDeactivateModal();
    this.closePreferencesModal();
    this.fcmService.requestNotificationPermission().then((permission) => {
      if (permission === 'granted') {
        this.toastService.success(this.translate.instant('NOTIFICATIONS.TOAST_ACTIVATED'));
        this.syncPreferenceSignals();
        this.loadOfferAlerts();
        this.isPreferencesModalOpen.set(true);
      } else if (permission === 'denied') {
        this.toastService.warn(this.translate.instant('NOTIFICATIONS.TOAST_BLOCKED'));
      }
    });
  }

  deactivateNotifications(): void {
    this.closeDeactivateModal();
    this.closePreferencesModal();
    this.fcmService.disableNotifications().then(() => {
      this.toastService.info(this.translate.instant('NOTIFICATIONS.TOAST_DEACTIVATED'));
      this.unreadNotifCount.set(0);
      this.notifications.set([]);
    });
  }

  hasAllSelected(): boolean {
    return (
      this.prefNewMessages() &&
      this.prefApplicationStatus() &&
      this.prefNewApplications() &&
      this.prefCvAnalysis() &&
      this.prefOfferAlerts()
    );
  }

  toggleSelectAll(): void {
    const targetState = !this.hasAllSelected();
    this.prefNewMessages.set(targetState);
    this.prefApplicationStatus.set(targetState);
    this.prefNewApplications.set(targetState);
    this.prefCvAnalysis.set(targetState);
    this.prefOfferAlerts.set(targetState);
  }

  savePreferences(): void {
    const prefs: NotificationPreferences = {
      newMessages: this.prefNewMessages(),
      applicationStatus: this.prefApplicationStatus(),
      newApplications: this.prefNewApplications(),
      cvAnalysis: this.prefCvAnalysis(),
      offerAlerts: this.prefOfferAlerts()
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
          this.toastService.success(this.translate.instant('NOTIFICATIONS.TOAST_UPDATED'));
        }
        this.closePreferencesModal();
      },
      error: (err) => {
        console.error('[Navbar] Error al guardar preferencias:', err);
        this.toastService.error(this.translate.instant('NOTIFICATIONS.TOAST_ERROR'));
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

  openHelpModal(): void {
    this.isHelpModalOpen.set(true);
    this.isHistoryOpen.set(false);
  }

  closeHelpModal(): void {
    this.isHelpModalOpen.set(false);
  }

  startOnboardingFromHelp(): void {
    this.closeHelpModal();
    this.closeMenu();
    this.router.navigate(['/']).then(() => {
      setTimeout(() => this.onboardingService.start(), 350);
    });
  }

  getBellIcon(): string {
    const permission = this.fcmService.permissionState();
    const enabled = this.fcmService.notificationsEnabled();

    if (permission === 'granted' && enabled) return 'notifications_active';
    if (permission === 'denied') return 'notifications_off';
    return 'notifications';
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.chatService.totalUnread$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((count) => this.unreadCount.set(count));

    // Si el usuario cambia su estado de login, cargar o limpiar notificaciones
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.loadInitialUnreadCount();
        this.chatService.getMyChats().subscribe({
          error: (err) => console.error('[Navbar] Error al precargar chats:', err)
        });
      } else {
        this.unreadNotifCount.set(0);
        this.notifications.set([]);
      }
    });

    // Escuchar notificaciones en tiempo real del socket
    this.chatService.newNotification$.pipe(takeUntilDestroyed(destroyRef)).subscribe((notif) => {
      this.notifications.update((prev) => [notif, ...prev]);
      this.unreadNotifCount.update((count) => count + 1);
    });

    // Escuchar notificaciones marcadas como leídas en cualquier parte (incluido clics de push)
    this.notificationHistoryService.notificationRead$.pipe(takeUntilDestroyed(destroyRef)).subscribe((id) => {
      let found = false;
      let wasUnread = false;

      this.notifications.update((prev) =>
        prev.map((n) => {
          if (n._id === id) {
            found = true;
            if (!n.read) wasUnread = true;
            return { ...n, read: true };
          }
          return n;
        })
      );

      if (wasUnread || !found) {
        this.unreadNotifCount.update((count) => Math.max(0, count - 1));
      }
    });

    // Escuchar notificaciones de un tipo específico marcadas como leídas contextualmente
    this.notificationHistoryService.notificationsReadByType$.pipe(takeUntilDestroyed(destroyRef)).subscribe((type) => {
      this.notifications.update((prev) => prev.map((n) => (n.type === type ? { ...n, read: true } : n)));
      this.loadInitialUnreadCount();
    });

    // Escuchar cambios de ruta para marcar notificaciones como leídas automáticamente
    this.router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      if (!this.authService.isLoggedIn()) return;
      const url = this.router.url;

      // Caso 1: Si entra a un chat, el backend ya marca el chat y sus notificaciones como leídas.
      // Recargamos el conteo tras un leve delay para asegurar sincronización.
      if (url.startsWith('/chats/')) {
        const parts = url.split('/');
        const chatId = parts[parts.length - 1]?.split('?')[0];
        if (chatId && chatId !== 'chats') {
          setTimeout(() => {
            this.loadInitialUnreadCount();
            this.notifications.update((prev) =>
              prev.map((n) => (n.type === 'chat' && n.metadata?.['chatId'] === chatId ? { ...n, read: true } : n))
            );
          }, 1000);
        }
      }

      // Caso 2: Si entra a solicitudes, marcar solicitudes y análisis de CV como leídas
      if (url.startsWith('/mis-solicitudes')) {
        this.notificationHistoryService.markReadByType('solicitud').subscribe();
        this.notificationHistoryService.markReadByType('cv_analysis').subscribe();
      }
    });
  }

  loadInitialUnreadCount(): void {
    this.notificationHistoryService.getNotifications(1, 1).subscribe({
      next: (res) => {
        this.unreadNotifCount.set(res.unreadCount || 0);
      },
      error: (err) => console.error('[Navbar] Error al cargar conteo inicial:', err)
    });
  }

  toggleHistory(): void {
    this.isMenuOpen.set(false); // cierra el dropdown de usuario si está abierto
    const nextState = !this.isHistoryOpen();
    this.isHistoryOpen.set(nextState);

    if (nextState) {
      this.loadNotifications(1, false);
    }
  }

  closeHistory(): void {
    this.isHistoryOpen.set(false);
  }

  loadNotifications(page: number, append: boolean): void {
    this.isLoadingNotifications.set(true);
    this.notificationHistoryService.getNotifications(page, 15).subscribe({
      next: (res) => {
        if (append) {
          this.notifications.update((prev) => [...prev, ...res.items]);
        } else {
          this.notifications.set(res.items);
        }

        this.unreadNotifCount.set(res.unreadCount || 0);
        this.currentPage.set(res.pagination.page);
        this.totalPages.set(res.pagination.totalPages);
        this.hasMore.set(res.pagination.hasNextPage);
        this.isLoadingNotifications.set(false);
      },
      error: (err) => {
        console.error('[Navbar] Error al cargar historial:', err);
        this.isLoadingNotifications.set(false);
      }
    });
  }

  loadMoreNotifications(): void {
    if (this.hasMore() && !this.isLoadingNotifications()) {
      this.loadNotifications(this.currentPage() + 1, true);
    }
  }

  markAsRead(notif: NotificationHistory): void {
    if (notif.read) return;
    this.notificationHistoryService.markAsRead(notif._id).subscribe({
      error: (err) => console.error('[Navbar] Error al marcar como leída:', err)
    });
  }

  markAllAsRead(): void {
    this.notificationHistoryService.markAllAsRead().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.update((prev) => prev.map((n) => ({ ...n, read: true })));
          this.unreadNotifCount.set(0);
          this.toastService.success(this.translate.instant('NOTIFICATIONS.TOAST_MARKED_ALL_READ'));
        }
      },
      error: (err) => console.error('[Navbar] Error al marcar todo como leído:', err)
    });
  }

  deleteNotification(event: Event, notif: NotificationHistory): void {
    event.stopPropagation(); // Evita navegar o marcar como leído
    this.notificationHistoryService.deleteNotification(notif._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.update((prev) => prev.filter((n) => n._id !== notif._id));
          if (!notif.read) {
            this.unreadNotifCount.update((count) => Math.max(0, count - 1));
          }
        }
      },
      error: (err) => console.error('[Navbar] Error al borrar notificación:', err)
    });
  }

  clearAllNotifications(): void {
    this.notificationHistoryService.clearAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.set([]);
          this.unreadNotifCount.set(0);
          this.isHistoryOpen.set(false);
          this.toastService.success(this.translate.instant('NOTIFICATIONS.TOAST_CLEARED_ALL'));
        }
      },
      error: (err) => console.error('[Navbar] Error al vaciar historial:', err)
    });
  }

  readAndNavigate(notif: NotificationHistory): void {
    this.markAsRead(notif);
    this.closeHistory();

    const targetUrl = notif.metadata?.['click_action'] || '/';
    this.router.navigateByUrl(targetUrl);
  }

  getNotificationIcon(type: 'chat' | 'solicitud' | 'cv_analysis' | 'alerta'): string {
    switch (type) {
      case 'chat':
        return 'chat_bubble';
      case 'solicitud':
        return 'inbox';
      case 'cv_analysis':
        return 'tune';
      case 'alerta':
        return 'storefront';
      default:
        return 'notifications';
    }
  }

  openPreferencesModal(): void {
    this.syncPreferenceSignals();
    this.loadOfferAlerts();
    this.isPreferencesModalOpen.set(true);
    this.isHistoryOpen.set(false); // Cierra el desplegable
  }

  loadOfferAlerts(): void {
    this.isLoadingOfferAlerts.set(true);
    this.alertaService.getAlertas().subscribe({
      next: (alertas) => {
        this.offerAlerts.set(alertas);
        this.isLoadingOfferAlerts.set(false);
      },
      error: (err) => {
        console.error('[Navbar] Error al cargar alertas de ofertas:', err);
        this.isLoadingOfferAlerts.set(false);
      }
    });
  }

  createOfferAlert(): void {
    if (!this.alertRegion().trim() && !this.alertRevenueRange() && !this.alertEmployeeRange()) {
      this.toastService.warn(this.translate.instant('NOTIFICATIONS.OFFER_ALERT_CRITERIA_REQUIRED'));
      return;
    }

    this.isSavingOfferAlert.set(true);
    this.alertaService
      .createAlerta({
        name: this.alertName().trim() || undefined,
        region: this.alertRegion().trim() || undefined,
        revenueRange: this.alertRevenueRange() || undefined,
        employeeRange: this.alertEmployeeRange() || undefined
      })
      .subscribe({
        next: (alerta) => {
          this.offerAlerts.update((prev) => [alerta, ...prev]);
          this.alertName.set('');
          this.alertRegion.set('');
          this.alertRevenueRange.set('');
          this.alertEmployeeRange.set('');
          this.isSavingOfferAlert.set(false);
          this.toastService.success(this.translate.instant('NOTIFICATIONS.OFFER_ALERT_CREATED'));
        },
        error: (err) => {
          console.error('[Navbar] Error al crear alerta de ofertas:', err);
          this.isSavingOfferAlert.set(false);
          this.toastService.error(this.translate.instant('NOTIFICATIONS.OFFER_ALERT_ERROR'));
        }
      });
  }

  deleteOfferAlert(alerta: AlertaOferta): void {
    if (!alerta._id) return;
    this.alertaService.deleteAlerta(alerta._id).subscribe({
      next: () => {
        this.offerAlerts.update((prev) => prev.filter((item) => item._id !== alerta._id));
      },
      error: (err) => console.error('[Navbar] Error al eliminar alerta de ofertas:', err)
    });
  }

  getAlertOffer(matchOffer: string | Oferta): Oferta | null {
    return typeof matchOffer === 'object' ? matchOffer : null;
  }

  getAlertTitle(alerta: AlertaOferta): string {
    return alerta.name?.trim() || this.translate.instant('NOTIFICATIONS.OFFER_ALERT_DEFAULT_NAME');
  }

  getAlertCriteria(alerta: AlertaOferta): string {
    const criteria = [
      alerta.region,
      alerta.employeeRange
        ? `${this.translate.instant('NOTIFICATIONS.OFFER_ALERT_EMPLOYEES_SHORT')} ${this.formatEmployees(alerta.employeeRange)}`
        : '',
      alerta.revenueRange ? this.formatRevenue(alerta.revenueRange) : ''
    ].filter(Boolean);

    return criteria.join(' · ');
  }

  formatRevenue(value?: string): string {
    return formatRevenueRange(value);
  }

  formatEmployees(value?: string): string {
    return formatEmployeeRange(value);
  }

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  onSearchInput(value: string): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }

    this.marketplaceSearchService.setQuery(value);
    if (!this.router.url.startsWith('/admin') && this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  handleSearchAccess(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
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
