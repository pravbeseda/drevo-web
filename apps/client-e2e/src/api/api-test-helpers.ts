import { APIRequestContext, expect } from '@playwright/test';

/**
 * API Base URL from environment or default
 * Use API_BASE_URL for direct API testing (e.g., http://drevo-local.ru)
 */
export const API_BASE_URL = process.env['API_BASE_URL'] || 'http://drevo-local.ru';

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}

/**
 * CSRF Token response
 */
export interface CsrfResponse {
    csrfToken: string;
}

/**
 * Echo endpoint response - wraps input data in 'received' property
 * Used by POST /api/test/echo
 */
export interface EchoResponse<T = Record<string, unknown>> {
    received: T;
}

/**
 * Helper to make API requests with common settings
 */
export async function apiGet<T>(
    request: APIRequestContext,
    endpoint: string,
    options?: {
        headers?: Record<string, string>;
        origin?: string;
    }
): Promise<{ response: Awaited<ReturnType<APIRequestContext['get']>>; body: ApiResponse<T> }> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...options?.headers,
    };

    if (options?.origin) {
        headers['Origin'] = options.origin;
    }

    const response = await request.get(`${API_BASE_URL}${endpoint}`, { headers });
    const body = await response.json();

    return { response, body };
}

/**
 * Helper to make POST API requests
 */
export async function apiPost<T>(
    request: APIRequestContext,
    endpoint: string,
    options?: {
        data?: unknown;
        headers?: Record<string, string>;
        origin?: string;
        csrfToken?: string;
    }
): Promise<{ response: Awaited<ReturnType<APIRequestContext['post']>>; body: ApiResponse<T> }> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
    };

    if (options?.origin) {
        headers['Origin'] = options.origin;
    }

    if (options?.csrfToken) {
        headers['X-CSRF-Token'] = options.csrfToken;
    }

    const response = await request.post(`${API_BASE_URL}${endpoint}`, {
        headers,
        data: options?.data,
    });

    let body: ApiResponse<T>;
    try {
        body = await response.json();
    } catch {
        body = { success: false, error: 'Invalid JSON response' };
    }

    return { response, body };
}

/**
 * Helper to get CSRF token
 */
export async function getCsrfToken(request: APIRequestContext): Promise<string> {
    const { response, body } = await apiGet<CsrfResponse>(request, '/api/test/csrf');
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.csrfToken).toBeTruthy();
    return body.data!.csrfToken;
}

/**
 * Expected security headers that should be present in API responses
 */
export const EXPECTED_SECURITY_HEADERS = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'same-origin',
};

/**
 * Verify security headers are present in response
 */
export function expectSecurityHeaders(response: Awaited<ReturnType<APIRequestContext['get']>>) {
    const headers = response.headers();

    for (const [header, expectedValue] of Object.entries(EXPECTED_SECURITY_HEADERS)) {
        expect(headers[header], `Header ${header} should be "${expectedValue}"`).toBe(expectedValue);
    }
}

/**
 * Allowed origins for CORS (depends on server configuration)
 * On dev server (drevo-local.ru): localhost:4200, localhost:4000
 * On prod server: https://new.drevo-info.ru
 */
export const ALLOWED_ORIGINS = ['http://localhost:4200', 'http://localhost:4000'];

/**
 * Origin that should be allowed on current test environment
 * Uses same-origin for simplicity (API_BASE_URL origin)
 */
export const SAME_ORIGIN = new URL(API_BASE_URL).origin;

/**
 * Test origin (not in allowed list)
 */
export const TEST_DISALLOWED_ORIGIN = 'https://evil-site.com';
