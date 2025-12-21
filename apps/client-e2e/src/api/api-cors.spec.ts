import { test, expect } from '@playwright/test';
import {
    API_BASE_URL,
    ALLOWED_ORIGINS,
    TEST_DISALLOWED_ORIGIN,
} from './api-test-helpers';

/**
 * API Integration Tests - CORS Headers
 * Tests for Task 1.2: CORS configuration for cross-origin requests
 *
 * NOTE: CORS behavior depends on server configuration:
 * - Dev server (drevo-local.ru): allows localhost:4200, localhost:4000
 * - Prod server: allows https://new.drevo-info.ru
 *
 * CORS Contract:
 * - Access-Control-Allow-Origin: specific origin (not *)
 * - Access-Control-Allow-Credentials: true
 * - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
 * - Access-Control-Allow-Headers: Content-Type, X-CSRF-Token
 * - Access-Control-Max-Age: 86400
 * - Vary: Origin (MUST be present in every response)
 */

test.describe('CORS Headers', () => {
    // Use first allowed origin for tests (configured for current environment)
    const allowedOrigin = ALLOWED_ORIGINS[0];

    test.describe('OPTIONS Preflight', () => {
        test('should return 204 for preflight from allowed origin', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: allowedOrigin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token',
                },
            });

            expect(response.status()).toBe(204);
        });

        test('preflight should include all required CORS headers', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: allowedOrigin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, X-CSRF-Token',
                },
            });

            const headers = response.headers();

            // Access-Control-Allow-Origin must be the specific origin
            expect(headers['access-control-allow-origin']).toBe(allowedOrigin);

            // Access-Control-Allow-Credentials must be true
            expect(headers['access-control-allow-credentials']).toBe('true');

            // Access-Control-Allow-Methods must include required methods
            const allowedMethods = headers['access-control-allow-methods'];
            expect(allowedMethods).toContain('GET');
            expect(allowedMethods).toContain('POST');
            expect(allowedMethods).toContain('OPTIONS');

            // Access-Control-Allow-Headers must include X-CSRF-Token
            const allowedHeaders = headers['access-control-allow-headers']?.toLowerCase();
            expect(allowedHeaders).toContain('content-type');
            expect(allowedHeaders).toContain('x-csrf-token');
        });

        test('preflight should NOT include CORS headers for disallowed origin', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: TEST_DISALLOWED_ORIGIN,
                    'Access-Control-Request-Method': 'POST',
                },
            });

            const headers = response.headers();

            // Should NOT have Access-Control-Allow-Origin for disallowed origin
            const allowOrigin = headers['access-control-allow-origin'];
            expect(allowOrigin).not.toBe(TEST_DISALLOWED_ORIGIN);
        });

        test('preflight from disallowed origin should return 403', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: TEST_DISALLOWED_ORIGIN,
                    'Access-Control-Request-Method': 'POST',
                },
            });

            // Server rejects disallowed origins with 403
            expect(response.status()).toBe(403);
        });
    });

    test.describe('Vary: Origin Header', () => {
        test('every API response should include Vary: Origin', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    Origin: allowedOrigin,
                },
            });

            const varyHeader = response.headers()['vary'];
            expect(varyHeader).toBeTruthy();
            expect(varyHeader?.toLowerCase()).toContain('origin');
        });

        test('Vary: Origin should be present even without Origin header', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    // No Origin header
                },
            });

            const varyHeader = response.headers()['vary'];
            expect(varyHeader).toBeTruthy();
            expect(varyHeader?.toLowerCase()).toContain('origin');
        });
    });

    test.describe('CORS for allowed origins', () => {
        test('should include CORS headers in preflight for allowed origin', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: allowedOrigin,
                    'Access-Control-Request-Method': 'GET',
                },
            });

            const headers = response.headers();

            expect(headers['access-control-allow-origin']).toBe(allowedOrigin);
            expect(headers['access-control-allow-credentials']).toBe('true');
        });

        test('regular GET response should include CORS headers for allowed origin', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    Origin: allowedOrigin,
                },
            });

            const headers = response.headers();

            // CORS headers should be present in regular responses too
            expect(headers['access-control-allow-origin']).toBe(allowedOrigin);
            expect(headers['access-control-allow-credentials']).toBe('true');
        });
    });

    test.describe('CORS for disallowed origins', () => {
        test('should NOT include Access-Control-Allow-Origin for disallowed origin', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    Origin: TEST_DISALLOWED_ORIGIN,
                },
            });

            const headers = response.headers();

            // Either no header or not matching the evil origin
            const allowOrigin = headers['access-control-allow-origin'];
            expect(allowOrigin).not.toBe(TEST_DISALLOWED_ORIGIN);
        });

        test('should NOT echo wildcard (*) for Access-Control-Allow-Origin', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/test/ping`, {
                headers: {
                    Accept: 'application/json',
                    Origin: allowedOrigin,
                },
            });

            const headers = response.headers();

            // Must NOT be wildcard (incompatible with credentials)
            expect(headers['access-control-allow-origin']).not.toBe('*');
        });
    });

    test.describe('Access-Control-Max-Age', () => {
        test('preflight response should include Max-Age', async ({ request }) => {
            const response = await request.fetch(`${API_BASE_URL}/api/test/ping`, {
                method: 'OPTIONS',
                headers: {
                    Origin: allowedOrigin,
                    'Access-Control-Request-Method': 'POST',
                },
            });

            const headers = response.headers();
            const maxAge = headers['access-control-max-age'];

            // Should have Max-Age header
            expect(maxAge).toBeTruthy();
            // Should be a reasonable value (at least 1 hour)
            expect(parseInt(maxAge)).toBeGreaterThanOrEqual(3600);
        });
    });
});
