/**
 * Authentication fixtures for Playwright E2E tests
 *
 * Provides pre-configured page objects with mocked auth state:
 * - authenticatedPage: User is logged in
 * - unauthenticatedPage: User is not logged in (guest)
 *
 * @example
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test('should show logout button for authenticated user', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/');
 *     await expect(authenticatedPage.locator('button:has-text("Выйти")')).toBeVisible();
 * });
 *
 * test('should redirect to login for unauthenticated user', async ({ unauthenticatedPage }) => {
 *     await unauthenticatedPage.goto('/');
 *     await expect(unauthenticatedPage).toHaveURL(/\/login/);
 * });
 * ```
 */

import { apiPatterns, authResponses, mockUsers } from './api-mocks';
import { User } from '@drevo-web/shared';
import { test as base, Page, Route } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

export interface AuthFixtures {
    /**
     * Page with mocked authenticated user state.
     * All auth API calls return successful responses with a logged-in user.
     */
    authenticatedPage: Page;

    /**
     * Page with mocked unauthenticated user state.
     * /api/auth/me returns 401, other auth endpoints work normally.
     */
    unauthenticatedPage: Page;

    /**
     * Page with all auth API mocked (both authenticated and unauthenticated scenarios).
     * Login/logout actually toggle the mock state.
     * Useful for testing full auth flows.
     */
    authMockedPage: Page;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Setup route mocking for authenticated user
 */
async function setupAuthenticatedMocks(
    page: Page,
    user: User = mockUsers.authenticated
): Promise<void> {
    // Mock /api/auth/me - return authenticated user
    await page.route(apiPatterns.authMe, async (route: Route) => {
        const response = authResponses.authenticatedMe(user);
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });

    // Mock /api/auth/csrf - always return a token
    await page.route(apiPatterns.authCsrf, async (route: Route) => {
        const response = authResponses.csrf();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });

    // Mock /api/auth/logout - successful logout
    await page.route(apiPatterns.authLogout, async (route: Route) => {
        const response = authResponses.logoutSuccess();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });
}

/**
 * Setup route mocking for unauthenticated user
 */
async function setupUnauthenticatedMocks(page: Page): Promise<void> {
    // Mock /api/auth/me - return 401 (not authenticated)
    await page.route(apiPatterns.authMe, async (route: Route) => {
        const response = authResponses.unauthenticatedMe();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });

    // Mock /api/auth/csrf - always return a token (needed for login form)
    await page.route(apiPatterns.authCsrf, async (route: Route) => {
        const response = authResponses.csrf();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });

    // Mock /api/auth/login - return failure (for invalid credentials tests)
    await page.route(apiPatterns.authLogin, async (route: Route) => {
        const response = authResponses.loginFailure();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });
}

/**
 * Setup route mocking with stateful auth (login/logout actually work)
 */
async function setupStatefulAuthMocks(page: Page): Promise<void> {
    let isAuthenticated = false;
    let currentUser: User | undefined = undefined;

    // Mock /api/auth/me - return based on current state
    await page.route(apiPatterns.authMe, async (route: Route) => {
        if (isAuthenticated && currentUser) {
            const response = authResponses.authenticatedMe(currentUser);
            await route.fulfill({
                status: response.status,
                contentType: 'application/json',
                body: JSON.stringify(response.json),
            });
        } else {
            const response = authResponses.unauthenticatedMe();
            await route.fulfill({
                status: response.status,
                contentType: 'application/json',
                body: JSON.stringify(response.json),
            });
        }
    });

    // Mock /api/auth/csrf - always return a token
    await page.route(apiPatterns.authCsrf, async (route: Route) => {
        const response = authResponses.csrf();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });

    // Mock /api/auth/login - toggle authenticated state
    await page.route(apiPatterns.authLogin, async (route: Route) => {
        // Parse request body to check credentials
        const postData = route.request().postData();
        let credentials: { username?: string; password?: string } = {};

        try {
            if (postData) {
                credentials = JSON.parse(postData);
            }
        } catch {
            // If JSON parsing fails, try URL-encoded format
            if (postData) {
                const params = new URLSearchParams(postData);
                credentials = {
                    username: params.get('username') ?? undefined,
                    password: params.get('password') ?? undefined,
                };
            }
        }

        // Accept any non-empty credentials for testing
        if (credentials.username && credentials.password) {
            isAuthenticated = true;
            currentUser = {
                ...mockUsers.authenticated,
                login: credentials.username,
                name: credentials.username,
            };
            const response = authResponses.loginSuccess(currentUser);
            await route.fulfill({
                status: response.status,
                contentType: 'application/json',
                body: JSON.stringify(response.json),
            });
        } else {
            const response = authResponses.loginFailure();
            await route.fulfill({
                status: response.status,
                contentType: 'application/json',
                body: JSON.stringify(response.json),
            });
        }
    });

    // Mock /api/auth/logout - toggle unauthenticated state
    await page.route(apiPatterns.authLogout, async (route: Route) => {
        isAuthenticated = false;
        currentUser = undefined;
        const response = authResponses.logoutSuccess();
        await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: JSON.stringify(response.json),
        });
    });
}

// ============================================================================
// Fixtures
// ============================================================================

/**
 * Extended test object with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
    authenticatedPage: async ({ page }, use) => {
        await setupAuthenticatedMocks(page);
        await use(page);
    },

    unauthenticatedPage: async ({ page }, use) => {
        await setupUnauthenticatedMocks(page);
        await use(page);
    },

    authMockedPage: async ({ page }, use) => {
        await setupStatefulAuthMocks(page);
        await use(page);
    },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';

// Export helper functions for custom scenarios
export {
    setupAuthenticatedMocks,
    setupUnauthenticatedMocks,
    setupStatefulAuthMocks,
};
