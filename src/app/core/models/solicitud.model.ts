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
  };
  owner: {
    _id: string;
    fullName: string;
    email: string;
  };
  opportunity: {
    _id: string;
    companyDescription: string;
    sector: string;
    region: string;
  };
  status: string;
  message?: string;
  cvKey?: string;
  estadoAnalisis?: string;
  resultadoIa?: ResultadoIa;
  createdAt: Date;
  updatedAt: Date;
}
