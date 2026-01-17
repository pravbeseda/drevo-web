import { test, expect } from '@playwright/test';
import {
    API_BASE_URL,
    apiPost,
    getCsrfToken,
    ALLOWED_ORIGINS,
} from './api-test-helpers';

/**
 * API Integration Tests - CSRF Protection
 * Tests for Task 1.1: CSRF validation for state-changing operations
 *
 * These tests verify:
 * - POST requests require valid CSRF token
 * - Invalid/missing CSRF token returns 403
 * - Valid CSRF token allows request
 *
 * Uses POST /api/auth/logout for testing as it:
 * - Requires CSRF token (state-changing)
 * - Works without valid credentials (idempotent for guest)
 */

test.describe('CSRF Protection', () => {
    // Use first allowed origin for tests
    const allowedOrigin = ALLOWED_ORIGINS[0];

    test.describe('POST /api/auth/logout (state-changing endpoint)', () => {
        test('should reject POST without CSRF token', async ({ request }) => {
            const { response, body } = await apiPost(
                request,
                '/api/auth/logout',
                {
                    origin: allowedOrigin, // Valid origin, but no CSRF
                }
            );

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
        });

        test('should reject POST with invalid CSRF token', async ({
            request,
        }) => {
            const { response, body } = await apiPost(
                request,
                '/api/auth/logout',
                {
                    origin: allowedOrigin,
                    csrfToken: 'invalid-token-12345',
                }
            );

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
        });

        test('should accept POST with valid CSRF token', async ({
            request,
        }) => {
            // First, get a valid CSRF token
            const csrfToken = await getCsrfToken(request);

            // Then make POST with valid token
            const { response, body } = await apiPost(
                request,
                '/api/auth/logout',
                {
                    origin: allowedOrigin,
                    csrfToken,
                }
            );

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });

        test('should accept X-XSRF-TOKEN header (Angular compatibility)', async ({
            request,
        }) => {
            // Get CSRF token
            const csrfToken = await getCsrfToken(request);

            // Use X-XSRF-TOKEN instead of X-CSRF-Token
            const response = await request.post(
                `${API_BASE_URL}/api/auth/logout`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Origin: allowedOrigin,
                        'X-XSRF-TOKEN': csrfToken,
                    },
                }
            );

            const body = await response.json();

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    test.describe('GET requests (read-only)', () => {
        test('GET /api/auth/csrf should work without CSRF token', async ({
            request,
        }) => {
            const response = await request.get(
                `${API_BASE_URL}/api/auth/csrf`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('csrfToken');
        });

        test('GET /api/auth/me should work without CSRF token', async ({
            request,
        }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    Accept: 'application/json',
                },
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
        });
    });

    test.describe('CSRF Token Lifecycle', () => {
        test('CSRF token should be consistent within session', async ({
            request,
        }) => {
            const token1 = await getCsrfToken(request);
            const token2 = await getCsrfToken(request);

            expect(token1).toBe(token2);
        });

        test('CSRF token should be long enough for security', async ({
            request,
        }) => {
            const token = await getCsrfToken(request);

            // Token should be at least 64 hex characters (256 bits)
            expect(token.length).toBeGreaterThanOrEqual(64);
            // Should be hex string
            expect(token).toMatch(/^[a-f0-9]+$/i);
        });
    });

    test.describe('CSRF for login endpoint', () => {
        test('POST /api/auth/login should reject without CSRF token', async ({
            request,
        }) => {
            const { response, body } = await apiPost(
                request,
                '/api/auth/login',
                {
                    data: { username: 'test', password: 'test' },
                    origin: allowedOrigin,
                    // No CSRF token
                }
            );

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
        });

        test('POST /api/auth/login should accept with valid CSRF token', async ({
            request,
        }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(
                request,
                '/api/auth/login',
                {
                    data: { username: 'nonexistent', password: 'wrong' },
                    origin: allowedOrigin,
                    csrfToken,
                }
            );

            // Should not be CSRF error - will be 401 for invalid credentials
            if (response.status() === 403) {
                expect(body.errorCode).not.toBe('CSRF_VALIDATION_FAILED');
            } else {
                expect(response.status()).toBe(401);
                expect(body.errorCode).toBe('INVALID_CREDENTIALS');
            }
        });
    });
});
