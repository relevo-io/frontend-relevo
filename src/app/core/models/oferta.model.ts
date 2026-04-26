export interface Oferta {
  _id?: string;
  region: string;
  sector: string;
  revenueRange?: string;
  owner?: string; //como opcional porque en el endpoint del marketplace en el backend decidimos no enviar el owner para proteger la privacidad del vendedor hasta que se apruebe la solicitud
  creationYear?: number;
  employeeRange?: string;
  companyDescription: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
