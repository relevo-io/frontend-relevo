
export interface Solicitud {
  _id: string;
  owner: any; 
  interestedUser: {
    _id: string;
    fullName: string;
    email: string;
    bio?: string;
    professionalBackground?: string;
    cv?: string;
  };
  opportunity: {
    _id: string;
    companyDescription: string;
    sector: string;
    region: string;
  };
  status: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}