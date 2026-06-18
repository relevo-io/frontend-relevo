// Alineado 100% con IUsuario del backend (Mongoose)
export const userRoles = ['OWNER', 'INTERESTED', 'ADMIN'] as const;
export const authProviders = ['local', 'google', 'github'] as const;

export interface NotificationPreferences {
  newMessages: boolean;
  applicationStatus: boolean;
  newApplications: boolean;
  cvAnalysis: boolean;
  offerAlerts: boolean;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface UserRating {
  _id?: string;
  ratedRole: 'OWNER' | 'INTERESTED';
  score: number;
  comment?: string;
  fromUser?: string | { _id?: string; fullName?: string };
  createdAt?: string;
}

export interface MyRatingsResponse {
  asOwner: RatingSummary;
  asInterested: RatingSummary;
  ratings: UserRating[];
}

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
  fcmTokens?: string[];
  notificationPreferences?: NotificationPreferences;
  ratingAsOwner?: RatingSummary;
  ratingAsInterested?: RatingSummary;
  createdAt?: string;
  updatedAt?: string;
}
