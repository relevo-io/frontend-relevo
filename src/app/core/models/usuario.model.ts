// Alineado 100% con IUsuario del backend (Mongoose)
export const userRoles = ['OWNER', 'INTERESTED', 'ADMIN'] as const;
export const authProviders = ['local', 'google', 'github'] as const;

export interface Usuario {
  _id?: string; // Opcional igual que en IUsuario del backend
  roles: (typeof userRoles)[number][];
  fullName: string; // required en el schema
  email: string; // required en el schema
  password?: string | null; // No necesario mostrarlo en el front
  authProvider?: (typeof authProviders)[number];
  providerId?: string | null;
  location?: string; // required: false
  bio?: string; // required: false
  professionalBackground?: string; // required: false
  cv?: string;
  preferredRegions?: string[];
  visible?: boolean;
  language?: string;
  theme?: string;
  createdAt?: string;
  updatedAt?: string;
}
