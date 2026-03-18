// Alineado 100% con IUsuario del backend (Mongoose)
// Roles confirmados: export const userRoles = ['OWNER', 'INTERESTED'] as const;
export interface Usuario {
  _id?: string;                    // Opcional igual que en IUsuario del backend
  role: 'OWNER' | 'INTERESTED';
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