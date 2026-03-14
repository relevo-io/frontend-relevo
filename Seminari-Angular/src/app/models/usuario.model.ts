import { Organizacion } from './organizacion.model';

export interface Usuario {
  _id: string;
  name: string;
  email: string;     
  password?: string;  // La contraseña es opcional para evitar exponerla al obtener el usuario
  organizacion: Organizacion | string;
  createdAt?: string;
  updatedAt?: string;
}