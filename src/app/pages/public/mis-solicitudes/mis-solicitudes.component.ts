import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { Solicitud } from '../../../core/models/solicitud.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.css'
})
export class MisSolicitudesComponent implements OnInit {
  private solicitudService = inject(SolicitudService);
  private authService = inject(AuthService);
  private ns = inject(NotificationService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  solicitudes = signal<Solicitud[]>([]);
  activeTab = signal<'received' | 'sent'>('received');
  isLoading = signal<boolean>(true);
  page = signal<number>(1);
  pageSize = 8;
  pagination = signal<PaginationMeta | null>(null);

  expandedAiIds = signal<Set<string>>(new Set());
  analizandoIds = signal<Set<string>>(new Set());

  userRoles = computed(() => this.authService.currentUser()?.roles || []);
  isOwner = computed(() => this.userRoles().includes('OWNER') || this.userRoles().includes('ADMIN'));

  constructor() {
    if (this.authService.isBrowser) {
      this.cargarSolicitudes();
    }
  }

  ngOnInit(): void {
    if (this.authService.isBrowser && !this.isOwner()) {
      this.activeTab.set('sent');
      this.cargarSolicitudes();
    }

    this.listenToRealtimeChanges();
  }

  cargarSolicitudes(): void {
    this.isLoading.set(true);
    const request =
      this.activeTab() === 'received'
        ? this.solicitudService.getMisSolicitudesOwnerPaged(this.page(), this.pageSize)
        : this.solicitudService.getMisSolicitudesEnviadasPaged(this.page(), this.pageSize);

    request.subscribe({
      next: (result) => {
        this.solicitudes.set(result.items);
        this.pagination.set(result.pagination);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando solicitudes:', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleAiExpansion(solicitudId: string): void {
    this.expandedAiIds.update((set) => {
      const next = new Set(set);
      if (next.has(solicitudId)) next.delete(solicitudId);
      else next.add(solicitudId);
      return next;
    });
  }

  isAiExpanded(solicitudId: string): boolean {
    return this.expandedAiIds().has(solicitudId);
  }

  isAnalizando(solicitudId: string): boolean {
    return this.analizandoIds().has(solicitudId);
  }

  analizarCv(solicitudId: string): void {
    this.analizandoIds.update((set) => new Set([...set, solicitudId]));

    this.solicitudes.update((list) =>
      list.map((s) => (s._id === solicitudId ? { ...s, estadoAnalisis: 'EN_PROCESO' } : s))
    );

    this.solicitudService.analizarCvConIa(solicitudId).subscribe({
      next: (solicitudActualizada) => {
        this.solicitudes.update((list) =>
          list.map((s) =>
            s._id === solicitudId
              ? {
                  ...s,
                  estadoAnalisis: solicitudActualizada.estadoAnalisis,
                  resultadoIa: solicitudActualizada.resultadoIa
                }
              : s
          )
        );

        this.analizandoIds.update((set) => {
          const next = new Set(set);
          next.delete(solicitudId);
          return next;
        });

        this.ns.success('Análisis de currículum completado con éxito');
        this.expandedAiIds.update((set) => new Set([...set, solicitudId]));
      },
      error: (err) => {
        console.error('Error al analizar CV:', err);
        this.solicitudes.update((list) =>
          list.map((s) => (s._id === solicitudId ? { ...s, estadoAnalisis: 'ERROR' } : s))
        );
        this.analizandoIds.update((set) => {
          const next = new Set(set);
          next.delete(solicitudId);
          return next;
        });

        const msg = err.error?.message || 'Error en el servicio de análisis de IA.';
        this.ns.error(msg);
      }
    });
  }

  setTab(tab: 'received' | 'sent'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    this.cargarSolicitudes();
  }

  cambiarEstado(id: string, nuevoEstado: string): void {
    this.solicitudService.updateStatus(id, nuevoEstado).subscribe({
      next: (actualizada) => {
        this.solicitudes.update((list) => list.map((s) => (s._id === id ? { ...s, status: actualizada.status } : s)));
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
      }
    });
  }

  verCv(solicitudId: string): void {
    this.solicitudService.getViewUrl(solicitudId).subscribe({
      next: ({ viewUrl }) => {
        window.open(viewUrl, '_blank', 'noopener,noreferrer');
      },
      error: (err) => {
        console.error('Error obteniendo URL de CV:', err);
        this.ns.error('No se pudo generar el enlace del CV.');
      }
    });
  }

  async contactar(solicitud: Solicitud): Promise<void> {
    if (solicitud.status !== 'ACCEPTED') return;

    try {
      const isOwner = this.isOwner();
      const interestedId = isOwner ? solicitud.interestedUser._id : undefined;

      const chat = await firstValueFrom(this.chatService.getOrCreateChat(solicitud.opportunity._id, interestedId));
      if (chat?._id) {
        this.router.navigate(['/chats', chat._id]);
      }
    } catch (err) {
      console.error('Error iniciando chat:', err);
      this.ns.error("No s'ha pogut obrir el xat.");
    }
  }

  prevPage(): void {
    const meta = this.pagination();
    if (!meta?.hasPrevPage) return;
    this.page.set(meta.page - 1);
    this.cargarSolicitudes();
  }

  nextPage(): void {
    const meta = this.pagination();
    if (!meta?.hasNextPage) return;
    this.page.set(meta.page + 1);
    this.cargarSolicitudes();
  }

  private listenToRealtimeChanges(): void {
    this.chatService.solicitudUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((solicitud) => {
      if (!this.isSolicitudRelevantForActiveTab(solicitud)) return;

      this.solicitudes.update((current) => {
        const index = current.findIndex((item) => item._id === solicitud._id);
        if (index !== -1) {
          const next = [...current];
          next[index] = solicitud;
          return next;
        }

        if (this.page() !== 1) return current;
        return [solicitud, ...current].slice(0, this.pageSize);
      });
    });

    this.chatService.solicitudDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ solicitudId }) => {
      this.solicitudes.update((current) => current.filter((item) => item._id !== solicitudId));
    });
  }

  private isSolicitudRelevantForActiveTab(solicitud: Solicitud): boolean {
    const currentUserId = this.authService.currentUser()?._id;
    if (!currentUserId) return false;

    if (this.activeTab() === 'received') {
      return this.isOwner() && solicitud.owner?._id === currentUserId;
    }

    return solicitud.interestedUser?._id === currentUserId;
  }
}
