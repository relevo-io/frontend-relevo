import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-section-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-section-placeholder.component.html',
  styleUrl: './admin-section-placeholder.component.css'
})
export class AdminSectionPlaceholderComponent {
  private route = inject(ActivatedRoute);

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'Seccion';
  }

  get subtitle(): string {
    return this.route.snapshot.data['subtitle'] ?? '';
  }

  get icon(): string {
    return this.route.snapshot.data['icon'] ?? 'dashboard';
  }

  get emptyTitle(): string {
    return this.route.snapshot.data['emptyTitle'] ?? 'No se han encontrado registros.';
  }

  get emptyMessage(): string {
    return this.route.snapshot.data['emptyMessage'] ?? '';
  }
}
