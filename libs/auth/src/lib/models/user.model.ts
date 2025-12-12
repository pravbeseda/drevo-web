export enum UserRole {
  Guest = 'guest',
  User = 'user',
  Author = 'author',
  Moderator = 'moderator',
  Admin = 'admin',
}

export interface User {
  id?: number;
  login: string;
  name?: string;
  email: string;
  role: UserRole | string;
  createTime?: string;
  lastVisit?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};
