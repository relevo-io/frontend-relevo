export interface Oportunidad {
  id?: string;
  ownerId: string;
  title: string;
  sector: string;
  region: string;
  cityApprox: string;
  businessAgeYears: number;
  employeeRange: string;
  descriptionShort: string;
  descriptionExtended: string;
  transitionType: string;
  status: 'active' | 'pending' | 'closed';
  visibilityLevel: 'public' | 'private';
}