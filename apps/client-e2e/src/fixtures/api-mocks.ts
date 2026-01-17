/**
 * Centralized API mock responses for E2E tests
 *
 * These mocks allow E2E tests to run without a real backend,
 * testing frontend logic in isolation.
 */

import { User, AuthResponse, CsrfResponse } from '@drevo-web/shared';

// ============================================================================
// Mock Users
// ============================================================================

export const mockUsers = {
    authenticated: {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'testuser@example.com',
        role: 'user',
        permissions: {
            canEdit: true,
            canModerate: false,
            canAdmin: false,
        },
    } satisfies User,

    admin: {
        id: 2,
        login: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        permissions: {
            canEdit: true,
            canModerate: true,
            canAdmin: true,
        },
    } satisfies User,
};

// ============================================================================
// Auth API Responses
// ============================================================================

export const authResponses = {
    /** Response for authenticated user checking /api/auth/me */
    authenticatedMe: (user: User = mockUsers.authenticated): { status: number; json: AuthResponse } => ({
        status: 200,
        json: {
            success: true,
            data: {
                isAuthenticated: true,
                user,
            },
        },
    }),

    /** Response for unauthenticated user checking /api/auth/me */
    unauthenticatedMe: (): { status: number; json: AuthResponse } => ({
        status: 200,
        json: {
            success: true,
            data: {
                isAuthenticated: false,
            },
        },
    }),

    /** Response for CSRF token request */
    csrf: (token = 'mock-csrf-token-12345'): { status: number; json: CsrfResponse } => ({
        status: 200,
        json: {
            success: true,
            data: {
                csrfToken: token,
            },
        },
    }),

    /** Successful login response */
    loginSuccess: (user: User = mockUsers.authenticated): { status: number; json: AuthResponse } => ({
        status: 200,
        json: {
            success: true,
            data: {
                isAuthenticated: true,
                user,
            },
        },
    }),

    /** Failed login response */
    loginFailure: (message = 'Invalid username or password'): { status: number; json: AuthResponse } => ({
        status: 401,
        json: {
            success: false,
            error: message,
            errorCode: 'INVALID_CREDENTIALS',
        },
    }),

    /** Successful logout response */
    logoutSuccess: (): { status: number; json: { success: boolean } } => ({
        status: 200,
        json: { success: true },
    }),
};

// ============================================================================
// API Endpoint Patterns
// ============================================================================

export const apiPatterns = {
    authMe: '**/api/auth/me',
    authCsrf: '**/api/auth/csrf',
    authLogin: '**/api/auth/login',
    authLogout: '**/api/auth/logout',
    /** All auth endpoints */
    authAll: '**/api/auth/**',
};

// ============================================================================
// Mock Data for Other Endpoints (extend as needed)
// ============================================================================

export const articleResponses = {
    // Add article mock responses here when needed
};
