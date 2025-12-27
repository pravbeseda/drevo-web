import { User } from './user';

export interface LoginRequest {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        isAuthenticated: boolean;
        user?: User;
        csrfToken?: string;
    };
    error?: string;
    errorCode?: string;
}

export interface CsrfResponse {
    success: boolean;
    data?: {
        csrfToken: string;
    };
    error?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
}
