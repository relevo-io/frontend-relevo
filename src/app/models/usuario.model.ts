export interface Usuario {
  id?: string;
  fullName: string;
  email: string;
  password?: string;
  role: 'owner' | 'investor';
  location: string;
  bio: string;
  yearsOfExperience: number;
  sectorsOfInterest: string[];
  preferredRegions: string[];
  transitionPreferences: string[];
}