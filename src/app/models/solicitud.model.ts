export type SolicitudStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Solicitud {
  _id: string;
  owner: any; 
  interestedUser: {
    _id: string;
    nombre: string;
    email: string;
  };
  opportunity: {
    _id: string;
    companyDescription: string;
  };
  status: SolicitudStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}