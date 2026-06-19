import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Oferta } from '../../../../core/models/oferta.model';
import { TranslateModule } from '@ngx-translate/core';
import { MonetizationService } from '../../../../core/services/monetization.service';

@Component({
  selector: 'app-oferta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './oferta-create.component.html',
  styleUrl: './oferta-create.component.css'
})
export class OfertaCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private monetizationService = inject(MonetizationService);

  isSaving = signal<boolean>(false);

  form = this.fb.group({
    region: ['', Validators.required],
    sector: ['', Validators.required],
    companyDescription: ['', [Validators.required, Validators.minLength(10)]],
    extendedDescription: ['', [Validators.required, Validators.minLength(20)]],
    revenueRange: [''],
    creationYear: [new Date().getFullYear(), [Validators.min(1800), Validators.max(new Date().getFullYear())]],
    employeeRange: ['']
  });

  get f() {
    return this.form.controls;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Partial<Oferta> = {
      region: raw.region?.trim() ?? '',
      sector: raw.sector?.trim() ?? '',
      companyDescription: raw.companyDescription?.trim() ?? '',
      extendedDescription: raw.extendedDescription?.trim() ?? '',
      creationYear: raw.creationYear ?? undefined,
      ...(raw.revenueRange ? { revenueRange: raw.revenueRange } : {}),
      ...(raw.employeeRange ? { employeeRange: raw.employeeRange } : {})
    };

    this.isSaving.set(true);
    this.monetizationService.setPendingOfferDraft(payload);
    this.isSaving.set(false);
    this.router.navigate(['/pago-simulado', 'publish-offer']);
  }
}
