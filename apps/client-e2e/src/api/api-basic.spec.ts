import { test, expect } from '@playwright/test';
import {
    API_BASE_URL,
    apiGet,
    expectSecurityHeaders,
    CsrfResponse,
    AuthMeResponse,
} from './api-test-helpers';

/**
 * API Integration Tests - Basic Endpoints
 * Tests for Task 1.1: Base API Controller
 *
 * These tests verify:
 * - API responds correctly to requests
 * - JSON response format is correct
 * - Security headers are present
 */

test.describe('API Basic Endpoints', () => {
    test.describe('GET /api/auth/csrf', () => {
        test('should return CSRF token', async ({ request }) => {
            const { response, body } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('csrfToken');
            expect(typeof body.data?.csrfToken).toBe('string');
            // CSRF token should be at least 64 hex characters (256 bits)
            expect(body.data?.csrfToken.length).toBeGreaterThanOrEqual(64);
        });

        test('should return JSON content type', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`);
            const contentType = response.headers()['content-type'];

            expect(contentType).toContain('application/json');
        });

        test('should include security headers', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`);

            expectSecurityHeaders(response);
        });

        test('should include no-cache headers for CSRF endpoint', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/csrf`);
            const headers = response.headers();

            // CSRF token should not be cached
            expect(headers['cache-control']).toContain('no-store');
        });

        test('should return same token for same session', async ({ request }) => {
            // First request
            const { body: body1 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            // Second request (same session via Playwright context)
            const { body: body2 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(body1.data?.csrfToken).toBe(body2.data?.csrfToken);
        });

        test('should not require authentication', async ({ request }) => {
            // Fresh request without any cookies/session
            const { response, body } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    test.describe('GET /api/auth/me', () => {
        test('should return isAuthenticated: false for guest', async ({ request }) => {
            const { response, body } = await apiGet<AuthMeResponse>(request, '/api/auth/me');

            expect(response.status()).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data?.isAuthenticated).toBe(false);
        });

        test('should return JSON content type', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`);
            const contentType = response.headers()['content-type'];

            expect(contentType).toContain('application/json');
        });

        test('should include security headers', async ({ request }) => {
            const response = await request.get(`${API_BASE_URL}/api/auth/me`);

            expectSecurityHeaders(response);
        });
    });

    test.describe('API Response Format', () => {
        test('should have consistent response structure', async ({ request }) => {
            const { body } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');

            // All API responses should have 'success' field
            expect(body).toHaveProperty('success');
            expect(typeof body.success).toBe('boolean');

            // Successful responses should have 'data' field
            if (body.success) {
                expect(body).toHaveProperty('data');
            }
        });

        test('error response should have consistent structure', async ({ request }) => {
            // Try to access non-existent endpoint
            const response = await request.get(`${API_BASE_URL}/api/auth/nonexistent`);
            const body = await response.json();

            expect(response.status()).toBe(404);
            expect(body).toHaveProperty('success', false);
            expect(body).toHaveProperty('error');
        });
    });
});
