import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizacionService } from '../services/organizacion.service';
import { Organizacion } from '../models/organizacion.model';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';


@Component({
  selector: 'app-organizacion-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './organizacion-list.html',
  styleUrls: ['./organizacion-list.css'],
})
export class OrganizacionList implements OnInit {
  organizaciones: Organizacion[] = [];
  organizacionesFiltradas: Organizacion[] = [];
  searchControl = new FormControl('');
  loading = true;
  errorMsg = '';
  mostrarForm = false;
  organizacionForm!: FormGroup;
  editando = false;
  organizacionEditId: string | null = null;
  expanded: { [key: string]: boolean } = {};
  limite = 10;
  mostrarTodasOrganizaciones = false;
  
  constructor(private api: OrganizacionService, private fb: FormBuilder, private cdr: ChangeDetectorRef, private dialog: MatDialog) {
    this.organizacionForm = this.fb.group({
      nombre: ['', Validators.required],
    });

    this.searchControl = new FormControl('');
  }

  //Función: leer
  ngOnInit(): void {
    this.load();

    this.searchControl.valueChanges.subscribe(value => {
      const term = value?.toLowerCase() ?? '';
  
      this.organizacionesFiltradas = this.organizaciones.filter(org =>
        org.name.toLowerCase().includes(term)
      );
    });
    
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    this.api.getOrganizaciones().subscribe({
      next: (res) => {
        this.organizaciones = res;
        this.organizacionesFiltradas = [...this.organizaciones];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'No se han podido cargar las organizaciones.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  //Función: trackBy para optimizar el ngFor
  trackById(_index: number, org: Organizacion): string {
    return org._id;
  }

  //Función: mostrar formulario
  mostrarFormulario(): void {
  this.mostrarForm = true;
  }

  //Función: mostrar más organizaciones
  mostrarMas(): void {
  this.mostrarTodasOrganizaciones = true;
  } 

  get organizacionesVisibles(): Organizacion[] {
    if (this.mostrarTodasOrganizaciones) {
      return this.organizacionesFiltradas;
    }
    return this.organizacionesFiltradas.slice(0, this.limite);
  }

  //Función: editar organización
  editar(org: Organizacion): void {
    this.mostrarForm = true;
    this.editando = true;
    this.organizacionEditId = org._id;

    this.organizacionForm.patchValue({
      nombre: org.name
    });
  }

  //Función: guardar organización (crear o actualizar)
  guardar(): void {

    if (this.organizacionForm.invalid) return;

    const nombre = this.organizacionForm.value.nombre;

    if (this.editando && this.organizacionEditId) {

      // UPDATE
      this.api.updateOrganizacion(this.organizacionEditId, nombre)
        .subscribe({
          next: () => {
            this.resetForm();
            this.load();
          },
          error: () => {
            this.errorMsg = 'No se ha podido actualizar la organización.';
          }
        });

    } else {

      // CREATE
      this.api.createOrganizacion(nombre)
        .subscribe({
          next: () => {
            this.resetForm();
            this.load();
          },
          error: () => {
            this.errorMsg = 'No se ha podido crear la organización.';
          }
        });
    }
  }

  //estado de expansión para mostrar el nombre completo
  toggleExpand(id: string): void {
    this.expanded[id] = !this.expanded[id];
  }

  //Función: resetear formulario
  resetForm(): void {
    this.mostrarForm = false;
    this.editando = false;
    this.organizacionEditId = null;
    this.organizacionForm.reset();
  }

  //Update: editar nombre de la organización
  editOrganizacion(org: Organizacion) {

    const nuevoNombre = prompt('Nuevo nombre:', org.name);

    if (nuevoNombre && nuevoNombre.trim() !== '') {

      this.api.updateOrganizacion(org._id, nuevoNombre)
        .subscribe(() => {

          // actualizar vista sin recargar
          org.name = nuevoNombre;

        });
    }
  }

  //Función: confirmar eliminación
  confirmDelete(id: string, name?: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: name
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.delete(id);
      }
    });
  }

  //Función: eliminar organización
  delete(id: string): void {
    this.errorMsg = '';
    this.loading = true;

    this.api.deleteOrganizacion(id).subscribe({
      next: () => {
        this.load();
      },
      error: () => {
        this.errorMsg = 'Error delete';
        this.loading = false;
      }
    });
  }
}
