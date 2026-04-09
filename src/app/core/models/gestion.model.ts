export interface Documento {
  id?: string;
  ofertaId: string;
  title: string;
  description: string;
  documentType: string;
  fileUrl: string;
  visibility: 'private' | 'shared';
}

export interface Transicion {
  id?: string;
  ofertaId: string;
  participantIds: string[];
  currentStage: string;
  notes: string;
}