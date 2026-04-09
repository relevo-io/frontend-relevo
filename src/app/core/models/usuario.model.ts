// Alineado 100% con IUsuario del backend (Mongoose)
export const userRoles = ['OWNER', 'INTERESTED', 'ADMIN'] as const;

export interface Usuario {
  _id?: string;                    // Opcional igual que en IUsuario del backend
  roles: Array<(typeof userRoles)[number]>;
  fullName: string;                // required en el schema
  email: string;                   // required en el schema
  password?: string;               // No necesario mostrarlo en el front
  location?: string;               // required: false
  bio?: string;                    // required: false
  professionalBackground?: string; // required: false
  preferredRegions?: string[];
  visible?: boolean;               // Nuevo campo para moderación
  createdAt?: string;
  updatedAt?: string;
}