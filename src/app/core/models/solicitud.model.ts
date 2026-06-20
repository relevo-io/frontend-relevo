import { RatingSummary } from './usuario.model';

export interface ResultadoIa {
  resumen: string;
  nota: number;
  comentarioNota: string;
  puntosFuertes: string[];
  experienciaDestacada: string[];
}

export interface Solicitud {
  _id: string;
  interestedUser: {
    _id: string;
    fullName: string;
    email: string;
    bio?: string;
    professionalBackground?: string;
    cv?: string;
    ratingAsInterested?: RatingSummary;
  };
  owner: {
    _id: string;
    fullName: string;
    email: string;
    ratingAsOwner?: RatingSummary;
  };
  opportunity: {
    _id: string;
    companyDescription: string;
    sector: string;
    region: string;
  };
  status: string;
  message?: string;
  bio?: string;
  professionalBackground?: string;
  preferredRegions?: string[];
  availableCapital?: number;
  financingNeeded?: boolean;
  ndaAccepted?: boolean;
  cvKey?: string;
  estadoAnalisis?: string;
  resultadoIa?: ResultadoIa;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolicitudDeletedEvent {
  solicitudId: string;
  opportunityId: string;
  ownerId: string;
  interestedUserId: string;
}
