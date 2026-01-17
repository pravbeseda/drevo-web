import { test, expect } from '@playwright/test';
import { API_BASE_URL, apiGet, CsrfResponse } from './api-test-helpers';

/**
 * API Integration Tests - Response Format
 * Tests for Task 1.1: Base API Controller
 *
 * These tests verify:
 * - API response format is consistent
 * - Error responses follow standard structure
 *
 * Note: Endpoint-specific tests (CSRF, /me, login, logout) are in api-auth.spec.ts
 */

test.describe('API Response Format', () => {
    test.describe('Response Structure', () => {
        test('should have consistent success response structure', async ({
            request,
        }) => {
            const { body } = await apiGet<CsrfResponse>(
                request,
                '/api/auth/csrf'
            );

            // All API responses should have 'success' field
            expect(body).toHaveProperty('success');
            expect(typeof body.success).toBe('boolean');

            // Successful responses should have 'data' field
            if (body.success) {
                expect(body).toHaveProperty('data');
            }
        });

        test('should have consistent error response structure', async ({
            request,
        }) => {
            // Try to access non-existent endpoint
            const response = await request.get(
                `${API_BASE_URL}/api/auth/nonexistent`
            );
            const body = await response.json();

            expect(response.status()).toBe(404);
            expect(body).toHaveProperty('success', false);
            expect(body).toHaveProperty('error');
        });
    });
});
