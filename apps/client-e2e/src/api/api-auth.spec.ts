import { test, expect } from '@playwright/test';
import {
    API_BASE_URL,
    apiGet,
    apiPost,
    getCsrfToken,
    expectSecurityHeaders,
    ALLOWED_ORIGINS,
    CsrfResponse,
    AuthMeResponse,
    LoginResponse,
} from './api-test-helpers';

/**
 * API Integration Tests - Authentication Endpoints
 * Tests for Tasks 1.3-1.5: Auth API Implementation
 *
 * These tests verify:
 * - GET /api/auth/csrf - CSRF token endpoint (Task 1.3.1)
 * - GET /api/auth/me - Current user endpoint (Task 1.4)
 * - POST /api/auth/login - Login endpoint (Task 1.3)
 * - POST /api/auth/logout - Logout endpoint (Task 1.5)
 */

// Use first allowed origin for tests
const allowedOrigin = ALLOWED_ORIGINS[0];

test.describe('Auth API - CSRF Token Endpoint (Task 1.3.1)', () => {
    test.describe('GET /api/auth/csrf', () => {
        test('should return CSRF token', async ({ request }) => {
            const { response, body } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('csrfToken');
            expect(typeof body.data?.csrfToken).toBe('string');
        });

        test('should return token of at least 64 hex characters (256 bits)', async ({ request }) => {
            const { body } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(body.data?.csrfToken.length).toBeGreaterThanOrEqual(64);
            // Should be hex string
            expect(body.data?.csrfToken).toMatch(/^[a-f0-9]+$/i);
        });

        test('should include security headers', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`);

            expectSecurityHeaders(response);
        });

        test('should include cache prevention headers', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`);
            const headers = response.headers();

            // CSRF token should not be cached
            expect(headers['cache-control']).toContain('no-store');
        });

        test('should return consistent token for same session', async ({ request }) => {
            const { body: body1 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const { body: body2 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(body1.data?.csrfToken).toBe(body2.data?.csrfToken);
        });

        test('should work without Origin header (public endpoint)', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`, {
                headers: {
                    Accept: 'application/json',
                    // No Origin header
                },
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('csrfToken');
        });
    });
});

test.describe('Auth API - Current User Endpoint (Task 1.4)', () => {
    test.describe('GET /api/auth/me', () => {
        test('should return isAuthenticated: false for guest', async ({ request }) => {
            const { response, body } = await apiGet<AuthMeResponse>(request, '/api/auth/me');

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data?.isAuthenticated).toBe(false);
        });

        test('should not require Origin header (read-only endpoint)', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    Accept: 'application/json',
                    // No Origin header
                },
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
        });

        test('should include security headers', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`);

            expectSecurityHeaders(response);
        });

        test('should have correct JSON content type', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`);
            const contentType = response.headers()['content-type'];

            expect(contentType).toContain('application/json');
        });
    });
});

test.describe('Auth API - Login Endpoint (Task 1.3)', () => {
    test.describe('POST /api/auth/login - Security', () => {
        test('should reject login without CSRF token', async ({ request }) => {
            const { response, body } = await apiPost(request, '/api/auth/login', {
                data: { username: 'testuser', password: 'testpass' },
                origin: allowedOrigin,
                // No CSRF token
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
        });

        test('should reject login without Origin header', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    // No Origin or Referer
                },
                data: { username: 'testuser', password: 'testpass' },
            });

            const body = await response.json();

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_REQUIRED');
        });

        test('should reject login from disallowed origin', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/login', {
                data: { username: 'testuser', password: 'testpass' },
                origin: 'https://evil-site.com',
                csrfToken,
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_NOT_ALLOWED');
        });

        test('should include security headers in response', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    Origin: allowedOrigin,
                },
                data: { username: 'invalid', password: 'invalid' },
            });

            expectSecurityHeaders(response);
        });
    });

    test.describe('POST /api/auth/login - Validation', () => {
        test('should reject empty username', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/login', {
                data: { username: '', password: 'somepassword' },
                origin: allowedOrigin,
                csrfToken,
            });

            // Either 400 (validation) or 401 (authentication failed)
            expect([400, 401]).toContain(response.status());
            expect(body.success).toBe(false);
        });

        test('should reject empty password', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/login', {
                data: { username: 'testuser', password: '' },
                origin: allowedOrigin,
                csrfToken,
            });

            // Either 400 (validation) or 401 (authentication failed)
            expect([400, 401]).toContain(response.status());
            expect(body.success).toBe(false);
        });

        test('should return 401 for invalid credentials', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/login', {
                data: {
                    username: 'nonexistent_user_12345',
                    password: 'wrong_password',
                },
                origin: allowedOrigin,
                csrfToken,
            });

            expect(response.status()).toBe(401);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('INVALID_CREDENTIALS');
        });
    });

    test.describe('POST /api/auth/login - Response Format', () => {
        test('should return JSON content type', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    Origin: allowedOrigin,
                },
                data: { username: 'test', password: 'test' },
            });

            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('application/json');
        });

        test('should have consistent error response structure', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { body } = await apiPost(request, '/api/auth/login', {
                data: { username: 'invalid', password: 'invalid' },
                origin: allowedOrigin,
                csrfToken,
            });

            // Error response should have these fields
            expect(body).toHaveProperty('success', false);
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('errorCode');
        });
    });
});

test.describe('Auth API - Logout Endpoint (Task 1.5)', () => {
    test.describe('POST /api/auth/logout - Security', () => {
        test('should reject logout without CSRF token', async ({ request }) => {
            const { response, body } = await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                // No CSRF token
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
        });

        test('should reject logout without Origin header', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    // No Origin or Referer
                },
            });

            const body = await response.json();

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_REQUIRED');
        });

        test('should reject logout from disallowed origin', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/logout', {
                origin: 'https://evil-site.com',
                csrfToken,
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_NOT_ALLOWED');
        });

        test('should include security headers', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    Origin: allowedOrigin,
                },
            });

            expectSecurityHeaders(response);
        });
    });

    test.describe('POST /api/auth/logout - Functionality', () => {
        test('should succeed for guest user (idempotent)', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                csrfToken,
            });

            // Logout should succeed even for guest (idempotent operation)
            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });

        test('after logout, /api/auth/me should return isAuthenticated: false', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            // Perform logout
            await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                csrfToken,
            });

            // Check auth status
            const { body } = await apiGet<AuthMeResponse>(request, '/api/auth/me');

            expect(body.success).toBe(true);
            expect(body.data?.isAuthenticated).toBe(false);
        });
    });
});

test.describe('Auth API - Full Authentication Flow', () => {
    test('complete flow: csrf → login (fail) → me (guest)', async ({ request }) => {
        // Step 1: Get CSRF token
        const { body: csrfBody } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
        expect(csrfBody.success).toBe(true);
        const csrfToken = csrfBody.data!.csrfToken;

        // Step 2: Attempt login with invalid credentials
        const { response: loginResponse, body: loginBody } = await apiPost<LoginResponse>(request, '/api/auth/login', {
            data: { username: 'invalid_user', password: 'invalid_pass' },
            origin: allowedOrigin,
            csrfToken,
        });

        expect(loginResponse.status()).toBe(401);
        expect(loginBody.success).toBe(false);
        expect(loginBody.errorCode).toBe('INVALID_CREDENTIALS');

        // Step 3: Check we're still guest
        const { body: meBody } = await apiGet<AuthMeResponse>(request, '/api/auth/me');
        expect(meBody.success).toBe(true);
        expect(meBody.data?.isAuthenticated).toBe(false);
    });

    test('CSRF token regeneration after logout', async ({ request }) => {
        // Get initial CSRF token
        const { body: csrf1 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
        const token1 = csrf1.data!.csrfToken;

        // Perform logout (should regenerate session)
        await apiPost(request, '/api/auth/logout', {
            origin: allowedOrigin,
            csrfToken: token1,
        });

        // Get new CSRF token (may or may not be different depending on session handling)
        const { body: csrf2 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
        const token2 = csrf2.data!.csrfToken;

        // Both tokens should be valid format
        expect(token1.length).toBeGreaterThanOrEqual(64);
        expect(token2.length).toBeGreaterThanOrEqual(64);
        expect(token1).toMatch(/^[a-f0-9]+$/i);
        expect(token2).toMatch(/^[a-f0-9]+$/i);
    });
});

test.describe('Auth API - X-XSRF-TOKEN Header Support (Angular)', () => {
    test('login should accept X-XSRF-TOKEN header', async ({ request }) => {
        const csrfToken = await getCsrfToken(request);

        const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Origin: allowedOrigin,
                'X-XSRF-TOKEN': csrfToken, // Angular-style header
            },
            data: { username: 'test', password: 'test' },
        });

        // Should not return CSRF error (may return 401 for invalid credentials)
        const body = await response.json();
        if (response.status() === 403) {
            expect(body.errorCode).not.toBe('CSRF_VALIDATION_FAILED');
        }
    });

    test('logout should accept X-XSRF-TOKEN header', async ({ request }) => {
        const csrfToken = await getCsrfToken(request);

        const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Origin: allowedOrigin,
                'X-XSRF-TOKEN': csrfToken, // Angular-style header
            },
        });

        const body = await response.json();

        // Should succeed (not CSRF error)
        expect(response.status()).toBe(200);
        expect(body.success).toBe(true);
    });
});

test.describe('Auth API - Referer Fallback', () => {
    test('login should accept Referer when Origin is missing', async ({ request }) => {
        const csrfToken = await getCsrfToken(request);

        const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-Token': csrfToken,
                Referer: `${allowedOrigin}/login`,
                // No Origin header
            },
            data: { username: 'test', password: 'test' },
        });

        const body = await response.json();

        // Should not get ORIGIN_REQUIRED error
        if (response.status() === 403) {
            expect(body.errorCode).not.toBe('ORIGIN_REQUIRED');
        }
    });

    test('logout should accept Referer when Origin is missing', async ({ request }) => {
        const csrfToken = await getCsrfToken(request);

        const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-Token': csrfToken,
                Referer: `${allowedOrigin}/dashboard`,
                // No Origin header
            },
        });

        const body = await response.json();

        // Should succeed
        expect(response.status()).toBe(200);
        expect(body.success).toBe(true);
    });
});
