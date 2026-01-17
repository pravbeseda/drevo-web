/**
 * Playwright E2E Test Fixtures
 *
 * This module exports the extended test object with custom fixtures
 * for different testing scenarios.
 *
 * @example
 * ```typescript
 * import { test, expect } from './fixtures';
 *
 * // Use authenticatedPage for tests requiring logged-in user
 * test('dashboard shows user info', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/dashboard');
 *     await expect(authenticatedPage.locator('.user-name')).toBeVisible();
 * });
 *
 * // Use unauthenticatedPage for tests requiring guest user
 * test('redirects to login', async ({ unauthenticatedPage }) => {
 *     await unauthenticatedPage.goto('/protected');
 *     await expect(unauthenticatedPage).toHaveURL(/\/login/);
 * });
 *
 * // Use authMockedPage for testing full login/logout flows
 * test('can login and logout', async ({ authMockedPage }) => {
 *     await authMockedPage.goto('/login');
 *     // ... fill form and submit
 *     await expect(authMockedPage).not.toHaveURL(/\/login/);
 * });
 * ```
 */

// Export auth fixtures and extended test
export {
    test,
    expect,
    setupAuthenticatedMocks,
    setupUnauthenticatedMocks,
    setupStatefulAuthMocks,
} from './auth.fixture';

// Export mock data for use in tests
export {
    mockUsers,
    authResponses,
    apiPatterns,
    articleResponses,
} from './api-mocks';

// Re-export types
export type { AuthFixtures } from './auth.fixture';
