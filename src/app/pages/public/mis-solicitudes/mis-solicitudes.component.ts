import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';
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

  solicitudes = signal<Solicitud[]>([]);
  activeTab = signal<'received' | 'sent'>('received');
  isLoading = signal<boolean>(true);
  page = signal<number>(1);
  pageSize = 8;
  pagination = signal<PaginationMeta | null>(null);

  // Almacenar qué solicitudes tienen su panel de IA expandido
  expandedAiIds = signal<Set<string>>(new Set());
  // Almacenar qué solicitudes están en proceso de análisis para mostrar loaders locales
  analizandoIds = signal<Set<string>>(new Set());

  userRoles = computed(() => this.authService.currentUser()?.roles || []);
  isOwner = computed(() => this.userRoles().includes('OWNER') || this.userRoles().includes('ADMIN'));

  constructor() {
    this.cargarSolicitudes();
  }

  ngOnInit() {
    // Si l'usuari no és owner, anem directament a la pestanya d'enviades
    if (!this.isOwner()) {
      this.activeTab.set('sent');
      this.cargarSolicitudes();
    }
  }

  cargarSolicitudes() {
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
        console.error('Error carregant sol·licituds:', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleAiExpansion(solicitudId: string) {
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

  analizarCv(solicitudId: string) {
    // Añadimos a la lista de cargando local
    this.analizandoIds.update((set) => new Set([...set, solicitudId]));

    // Actualizamos localmente el estado de análisis a EN_PROCESO para feedback inmediato
    this.solicitudes.update((list) =>
      list.map((s) => (s._id === solicitudId ? { ...s, estadoAnalisis: 'EN_PROCESO' } : s))
    );

    this.solicitudService.analizarCvConIa(solicitudId).subscribe({
      next: (solicitudActualizada) => {
        // Actualizamos la solicitud en el listado local (mezclando los campos de IA para no perder las relaciones populadas)
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
        // Quitamos del set de cargando
        this.analizandoIds.update((set) => {
          const next = new Set(set);
          next.delete(solicitudId);
          return next;
        });
        this.ns.success('Análisis de currículum completado con éxito');

        // Auto-expandir el resultado
        this.expandedAiIds.update((set) => new Set([...set, solicitudId]));
      },
      error: (err) => {
        console.error('Error al analizar CV:', err);
        // Actualizamos localmente el estado a ERROR
        this.solicitudes.update((list) =>
          list.map((s) => (s._id === solicitudId ? { ...s, estadoAnalisis: 'ERROR' } : s))
        );
        // Quitamos del set de cargando
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

  setTab(tab: 'received' | 'sent') {
    this.activeTab.set(tab);
    this.page.set(1);
    this.cargarSolicitudes();
  }

  cambiarEstado(id: string, nuevoEstado: string) {
    this.solicitudService.updateStatus(id, nuevoEstado).subscribe({
      next: (actualizada) => {
        this.solicitudes.update((list) => list.map((s) => (s._id === id ? { ...s, status: actualizada.status } : s)));
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
      }
    });
  }

  verCv(solicitudId: string) {
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

  async contactar(solicitud: Solicitud) {
    if (solicitud.status !== 'ACCEPTED') return;

    try {
      const isOwner = this.isOwner();
      // Si el que contacta és el propietari, hem de passar l'ID de l'interessat
      const interestedId = isOwner ? solicitud.interestedUser._id : undefined;

      const chat = await firstValueFrom(this.chatService.getOrCreateChat(solicitud.opportunity._id, interestedId));
      if (chat?._id) {
        this.router.navigate(['/chats', chat._id]);
      }
    } catch (err) {
      console.error('Error iniciant xat:', err);
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
}
