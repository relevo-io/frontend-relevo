import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { Solicitud } from '../../../core/models/solicitud.model';
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
        ? this.solicitudService.getMisSolicitudesOwner()
        : this.solicitudService.getMisSolicitudesEnviadas();

    request.subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error carregant sol·licituds:', err);
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'received' | 'sent') {
    this.activeTab.set(tab);
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
}
