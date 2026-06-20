import { Oferta } from './oferta.model';

export interface Canvi {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
}

export interface Historial {
  _id: string;
  ofertaId: string | Oferta;
  fecha: string;
  canvis: Canvi[];
}

export interface HistorialPaginatedResponse {
  total: number;
  page: number;
  totalPages: number;
  data: Historial[];
}
