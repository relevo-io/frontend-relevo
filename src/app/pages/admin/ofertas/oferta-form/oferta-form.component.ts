import {
  Component,
  inject,
  input,
  output,
  effect,
  signal,
  OnInit,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OfertaService } from '../../../../core/services/oferta.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Oferta } from '../../../../core/models/oferta.model';
import { Usuario } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-oferta-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './oferta-form.component.html',
  styleUrl: './oferta-form.component.css',
})
export class OfertaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ofertaService = inject(OfertaService);
  private usuarioService = inject(UsuarioService);

  // --- INPUTS / OUTPUTS ---
  oferta = input<Oferta | null>(null);
  isOpen  = input<boolean>(false);
  saved   = output<Oferta>();
  closed  = output<void>();

  // --- ESTADO INTERNO ---
  isSaving = signal<boolean>(false);
  saveError = signal<string | null>(null);
  usuarios = signal<Usuario[]>([]);

  // --- FORMULARIO ---
  form = this.fb.group({
    region: ['', Validators.required],
    sector: ['', Validators.required],
    companyDescription: ['', [Validators.required, Validators.minLength(10)]],
    extendedDescription: ['', [Validators.required, Validators.minLength(20)]],
    revenueRange: [''],
    creationYear: [new Date().getFullYear(), [Validators.min(1800), Validators.max(new Date().getFullYear())]],
    employeeRange: [''],
    owner: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const o = this.oferta();
      if (o) {
        this.form.patchValue({
          region: o.region,
          sector: o.sector,
          companyDescription: o.companyDescription,
          extendedDescription: o.extendedDescription ?? '',
          revenueRange: o.revenueRange ?? '',
          creationYear: o.creationYear ?? new Date().getFullYear(),
          employeeRange: o.employeeRange ?? '',
          owner: typeof o.owner === 'string' ? o.owner : (o.owner as any)?._id || '69badc3148170f008dcf068b',
        });
      } else {
        this.form.reset({
          owner: '',
          creationYear: new Date().getFullYear()
        });
      }
      this.saveError.set(null);
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => {
        // Filtramos para que solo salgan usuarios visibles (o que no tengan el campo visible, asumiendo true)
        const visibles = data.filter(u => u.visible !== false);
        this.usuarios.set(visibles);
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  get modoCrear(): boolean { return !this.oferta(); }
  get titulo(): string { return this.modoCrear ? 'Añadir Oferta' : 'Editar Oferta'; }

  get f() { return this.form.controls; }

  cerrar(): void {
    this.form.reset();
    this.closed.emit();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const payload = this.form.value as Oferta;

    if (this.modoCrear) {
      this.ofertaService.createOferta(payload).subscribe({
        next: (nuevo) => {
          this.isSaving.set(false);
          this.saved.emit(nuevo);
          this.cerrar();
        },
        error: (err) => {
          console.error(err);
          this.saveError.set('Error al crear la oferta.');
          this.isSaving.set(false);
        },
      });
    } else {
      const id = this.oferta()!._id!;
      this.ofertaService.updateOferta(id, payload).subscribe({
        next: (actualizada) => {
          this.isSaving.set(false);
          this.saved.emit(actualizada);
          this.cerrar();
        },
        error: (err) => {
          console.error(err);
          this.saveError.set('Error al guardar los cambios.');
          this.isSaving.set(false);
        },
      });
    }
  }
}
