export interface AuthUser {
  id: number;
  email: string;
  role: string;
  staffProfile?: {
    id: number;
  } | null;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: AuthUser;
  isValid: boolean;
}