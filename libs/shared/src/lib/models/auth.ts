import { User } from './user';

export interface LoginRequest {
    readonly username: string;
    readonly password: string;
    readonly rememberMe?: boolean;
}

export interface AuthResponse {
    readonly success: boolean;
    readonly data?: {
        readonly isAuthenticated: boolean;
        readonly user?: User;
        readonly csrfToken?: string;
    };
    readonly error?: string;
    readonly errorCode?: string;
}

export interface CsrfResponse {
    readonly success: boolean;
    readonly data?: {
        readonly csrfToken: string;
    };
    readonly error?: string;
}

export interface AuthState {
    readonly isAuthenticated: boolean;
    readonly user: User | undefined;
    readonly isLoading: boolean;
}
