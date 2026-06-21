import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Importem per fer servir *ngFor, *ngIf i el format de data
import { FormsModule } from '@angular/forms'; // Importem per fer servir [(ngModel)] al cercador
import { HistorialService } from '../../../core/services/historial.service';
import { Historial } from '../../../core/models/historial.model';
import { Oferta } from '../../../core/models/oferta.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class HistorialComponent implements OnInit {
  // Variables que l'HTML està buscant:
  historials: Historial[] = [];
  currentPage = 1;
  totalPages = 1;
  limit = 5;
  searchTerm = '';

  private historialService = inject(HistorialService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.carregarHistorials();
  }

  // Mètode per demanar les dades al backend
  carregarHistorials(): void {
    this.historialService.getHistorials(this.currentPage, this.limit, this.searchTerm).subscribe({
      next: (response) => {
        const historialResponse = response as {
          data: Historial[];
          totalPages: number;
          page: number;
        };
        this.historials = historialResponse.data;
        this.totalPages = historialResponse.totalPages;
        this.currentPage = historialResponse.page;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al carregar historials', err)
    });
  }

  // Mètode que crida el botó "Buscar"
  onSearch(): void {
    this.currentPage = 1;
    this.carregarHistorials();
  }

  // Mètode que criden els botons de Paginació
  canviarPagina(novaPagina: number): void {
    if (novaPagina >= 1 && novaPagina <= this.totalPages) {
      this.currentPage = novaPagina;
      this.carregarHistorials();
    }
  }

  // Mètode per esborrar un registre
  esborrarRegistre(id: string): void {
    if (confirm('Estàs segur que vols esborrar aquest registre?')) {
      this.historialService.deleteHistorial(id).subscribe({
        next: () => this.carregarHistorials(),
        error: (err) => console.error('Error al esborrar', err)
      });
    }
  }

  mostrarOferta(oferta: string | Oferta | any): string {
    // Si es un objeto y tiene la propiedad sector, mostramos el sector
    if (!oferta) {
      return 'Sense ID';
    }
    if (typeof oferta === 'object') {
      if (oferta.sector) {
        return oferta.sector;
      }
      // Si viene poblado pero sin sector, intentamos mostrar al menos su ID interno
      if (oferta._id) {
        return oferta._id;
      }
      return 'Objecte desconegut';
    }

    return oferta as string;
  }
}
