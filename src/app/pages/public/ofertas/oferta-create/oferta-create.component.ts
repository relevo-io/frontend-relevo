import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OfertaService } from '../../../../core/services/oferta.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Oferta } from '../../../../core/models/oferta.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-oferta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './oferta-create.component.html',
  styleUrl: './oferta-create.component.css',
})
export class OfertaCreateComponent {
  private fb = inject(FormBuilder);
  private ofertaService = inject(OfertaService);
  private ns = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  isSaving = signal<boolean>(false);

  form = this.fb.group({
    region: ['', Validators.required],
    sector: ['', Validators.required],
    companyDescription: ['', [Validators.required, Validators.minLength(10)]],
    extendedDescription: ['', [Validators.required, Validators.minLength(20)]],
    revenueRange: [''],
    creationYear: [new Date().getFullYear(), [Validators.min(1800), Validators.max(new Date().getFullYear())]],
    employeeRange: [''],
  });

  get f() {
    return this.form.controls;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const raw = this.form.getRawValue();
    const payload: Oferta = {
      region: raw.region?.trim() ?? '',
      sector: raw.sector?.trim() ?? '',
      companyDescription: raw.companyDescription?.trim() ?? '',
      extendedDescription: raw.extendedDescription?.trim() ?? '',
      creationYear: raw.creationYear ?? undefined,
      ...(raw.revenueRange ? { revenueRange: raw.revenueRange } : {}),
      ...(raw.employeeRange ? { employeeRange: raw.employeeRange } : {}),
    };

    this.ofertaService.createOferta(payload).subscribe({
      next: (ofertaCreada) => {
        this.isSaving.set(false);
        this.ns.success(this.translate.instant('COMMON.NOTIF.OFFER_CREATED_SUCCESS'));
        if (ofertaCreada._id) {
          this.router.navigate(['/ofertas', ofertaCreada._id]);
          return;
        }
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error al crear oferta:', err);
        if (err?.error?.errorCode !== 'VALIDATION_ERROR') {
          this.ns.error(this.translate.instant('COMMON.NOTIF.OFFER_CREATED_ERROR'));
        }
        this.isSaving.set(false);
      },
    });
  }
}
