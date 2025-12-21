import { test, expect } from '@playwright/test';
import {
    API_BASE_URL,
    apiPost,
    getCsrfToken,
    ALLOWED_ORIGINS,
    TEST_DISALLOWED_ORIGIN,
} from './api-test-helpers';

/**
 * API Integration Tests - Origin/Referer Validation
 * Tests for Task 1.1: Origin/Referer validation for state-changing operations
 *
 * Security model:
 * - POST/PUT/DELETE/PATCH require Origin or Referer header
 * - If both missing → 403 ORIGIN_REQUIRED
 * - If present but not in whitelist → 403 ORIGIN_NOT_ALLOWED
 * - GET requests don't require Origin/Referer validation
 *
 * NOTE: Allowed origins depend on server configuration:
 * - Dev: localhost:4200, localhost:4000
 * - Prod: https://new.drevo-info.ru
 */

test.describe('Origin/Referer Validation', () => {
    // Use first allowed origin for tests
    const allowedOrigin = ALLOWED_ORIGINS[0];
    test.describe('POST without Origin/Referer', () => {
        test('should reject POST without Origin and Referer headers', async ({ request }) => {
            // Get CSRF token first
            const csrfToken = await getCsrfToken(request);

            // POST without Origin or Referer
            const response = await request.post(`${API_BASE_URL}/api/test/echo`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    // No Origin, no Referer
                },
                data: { test: 'data' },
            });

            const body = await response.json();

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_REQUIRED');
        });
    });

    test.describe('POST with disallowed Origin', () => {
        test('should reject POST from disallowed origin', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/test/echo', {
                data: { test: 'data' },
                origin: TEST_DISALLOWED_ORIGIN,
                csrfToken,
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_NOT_ALLOWED');
        });

        test('should reject POST from random origin', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const { response, body } = await apiPost(request, '/api/test/echo', {
                data: { test: 'data' },
                origin: 'https://attacker-site.com',
                csrfToken,
            });

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_NOT_ALLOWED');
        });
    });

    test.describe('POST with allowed Origin', () => {
        test('should accept POST from allowed origin', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            // Use configured allowed origin
            const { response, body } = await apiPost(request, '/api/test/echo', {
                data: { test: 'allowed-origin' },
                origin: allowedOrigin,
                csrfToken,
            });

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    test.describe('POST with Referer (fallback)', () => {
        test('should accept POST with valid Referer when Origin is missing', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            // Parse allowed origin to use as Referer
            const refererUrl = new URL(allowedOrigin);

            const response = await request.post(`${API_BASE_URL}/api/test/echo`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    Referer: `${refererUrl.origin}/some/page`,
                    // No Origin header
                },
                data: { test: 'referer-only' },
            });

            const body = await response.json();

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });

        test('should reject POST with invalid Referer when Origin is missing', async ({ request }) => {
            const csrfToken = await getCsrfToken(request);

            const response = await request.post(`${API_BASE_URL}/api/test/echo`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': csrfToken,
                    Referer: 'https://evil-site.com/attack',
                    // No Origin header
                },
                data: { test: 'invalid-referer' },
            });

            const body = await response.json();

            expect(response.status()).toBe(403);
            expect(body.success).toBe(false);
            expect(body.errorCode).toBe('ORIGIN_NOT_ALLOWED');
        });
    });

    test.describe('GET requests (no Origin validation)', () => {
        test('GET should work without Origin header', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    // No Origin
                },
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
        });

        test('GET should work with any Origin header', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    Origin: 'https://any-origin.com',
                },
            });

            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);
        });
    });
});
