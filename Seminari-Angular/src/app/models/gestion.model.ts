export interface Documento {
  id?: string;
  oportunidadId: string;
  title: string;
  description: string;
  documentType: string;
  fileUrl: string;
  visibility: 'private' | 'shared';
}

export interface Transicion {
  id?: string;
  oportunidadId: string;
  participantIds: string[];
  currentStage: string;
  notes: string;
}