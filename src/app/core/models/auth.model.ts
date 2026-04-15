import { Usuario } from './usuario.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  roles: ('OWNER' | 'INTERESTED')[];
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  usuario: Usuario;
  refreshToken?: string; // Por si lo implementas en el futuro
}

export interface JwtPayload {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}
