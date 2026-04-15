export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string; 
  message: string;   
  details?: ApiErrorDetail[]; 
  timestamp: string;
}
