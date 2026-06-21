import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationHistoryService } from '../../../core/services/notification-history.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationHistory } from '../../../core/models/notification.model';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';

@Component({
  selector: 'app-admin-notificaciones',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './admin-notificaciones.component.html',
  styleUrl: './admin-notificaciones.component.css'
})
export class AdminNotificacionesComponent implements OnInit {
  private notificationHistoryService = inject(NotificationHistoryService);
  private toast = inject(NotificationService);
  private confirmService = inject(ConfirmDialogService);

  notifications = signal<NotificationHistory[]>([]);
  unreadCount = signal(0);
  isLoading = signal(true);
  isRefreshing = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(15);
  totalItems = signal(0);
  totalPages = signal(1);
  hasNextPage = signal(false);
  hasPrevPage = signal(false);

  searchQuery = signal('');
  typeFilter = signal<'ALL' | NotificationHistory['type']>('ALL');
  readFilter = signal<'ALL' | 'READ' | 'UNREAD'>('ALL');

  filteredNotifications = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const type = this.typeFilter();
    const readState = this.readFilter();

    return this.notifications().filter((notification) => {
      const matchesType = type === 'ALL' || notification.type === type;
      const matchesReadState = readState === 'ALL' || (readState === 'READ' ? notification.read : !notification.read);
      const haystack = `${notification.title} ${notification.body}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);

      return matchesType && matchesReadState && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(page = this.currentPage()): void {
    this.currentPage.set(page);
    this.error.set(null);
    this.isLoading.set(!this.isRefreshing());

    this.notificationHistoryService.getNotifications(page, this.pageSize()).subscribe({
      next: (response) => {
        this.notifications.set(response.items);
        this.unreadCount.set(response.unreadCount);
        this.totalItems.set(response.pagination.totalItems);
        this.totalPages.set(Math.max(1, response.pagination.totalPages));
        this.hasNextPage.set(response.pagination.hasNextPage);
        this.hasPrevPage.set(response.pagination.hasPrevPage);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Error loading notification history', err);
        this.error.set('No se pudieron cargar las notificaciones del sistema.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  refresh(): void {
    this.isRefreshing.set(true);
    this.fetchNotifications(this.currentPage());
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  updateType(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as 'ALL' | NotificationHistory['type']);
  }

  updateReadState(event: Event): void {
    this.readFilter.set((event.target as HTMLSelectElement).value as 'ALL' | 'READ' | 'UNREAD');
  }

  markAsRead(notification: NotificationHistory): void {
    if (notification.read) return;

    this.notificationHistoryService.markAsRead(notification._id).subscribe({
      next: () => {
        this.notifications.update((current) =>
          current.map((item) => (item._id === notification._id ? { ...item, read: true } : item))
        );
        this.unreadCount.update((count) => Math.max(0, count - 1));
        this.toast.success('Notificacion marcada como leida');
      },
      error: (err) => {
        console.error('Error marking notification as read', err);
        this.toast.error('No se pudo marcar la notificacion como leida');
      }
    });
  }

  markAllAsRead(): void {
    this.notificationHistoryService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((current) => current.map((item) => ({ ...item, read: true })));
        this.unreadCount.set(0);
        this.toast.success('Todas las notificaciones han sido marcadas como leidas');
      },
      error: (err) => {
        console.error('Error marking all notifications as read', err);
        this.toast.error('No se pudieron marcar todas como leidas');
      }
    });
  }

  async clearAll(): Promise<void> {
    const confirmed = await this.confirmService.ask(
      'Vaciar bandeja',
      'Se eliminaran todas las notificaciones visibles para este usuario admin. Esta accion no se puede deshacer.',
      'Vaciar bandeja'
    );

    if (!confirmed) return;

    this.notificationHistoryService.clearAll().subscribe({
      next: () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.hasNextPage.set(false);
        this.hasPrevPage.set(false);
        this.toast.success('Bandeja de notificaciones vaciada');
      },
      error: (err) => {
        console.error('Error clearing notification inbox', err);
        this.toast.error('No se pudo vaciar la bandeja');
      }
    });
  }

  async deleteNotification(notification: NotificationHistory): Promise<void> {
    const confirmed = await this.confirmService.ask(
      'Eliminar notificacion',
      `Se eliminara la notificacion "${notification.title}".`,
      'Eliminar'
    );

    if (!confirmed) return;

    this.notificationHistoryService.deleteNotification(notification._id).subscribe({
      next: () => {
        if (!notification.read) {
          this.unreadCount.update((count) => Math.max(0, count - 1));
        }
        this.notifications.update((current) => current.filter((item) => item._id !== notification._id));
        this.totalItems.update((total) => Math.max(0, total - 1));
        this.toast.success('Notificacion eliminada');
      },
      error: (err) => {
        console.error('Error deleting notification', err);
        this.toast.error('No se pudo eliminar la notificacion');
      }
    });
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.fetchNotifications(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevPage()) {
      this.fetchNotifications(this.currentPage() - 1);
    }
  }

  pageStart(): number {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  }

  typeLabel(type: NotificationHistory['type']): string {
    const labels: Record<NotificationHistory['type'], string> = {
      chat: 'Chat',
      solicitud: 'Solicitud',
      cv_analysis: 'CV Analysis',
      alerta: 'Alerta'
    };
    return labels[type];
  }

  typeClass(type: NotificationHistory['type']): string {
    const classes: Record<NotificationHistory['type'], string> = {
      chat: 'info',
      solicitud: 'warning',
      cv_analysis: 'neutral',
      alerta: 'success'
    };
    return classes[type];
  }
}
