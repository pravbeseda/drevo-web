import { apiError, apiSuccess, mockUsers } from '../mocks';
import { User } from '@drevo-web/shared';
import { Page } from '@playwright/test';

/** Mock auth endpoints for an authenticated user */
export async function mockAuthApi(page: Page, user: User = mockUsers.authenticated): Promise<void> {
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user }),
        }),
    );

    await page.route('**/api/auth/csrf', route =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );

    await page.route('**/api/auth/logout', route => route.fulfill({ json: apiSuccess(undefined) }));
}

/** Mock auth endpoints for an unauthenticated user */
export async function mockUnauthenticatedApi(page: Page): Promise<void> {
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: false }),
        }),
    );

    await page.route('**/api/auth/csrf', route =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );
}

/** Mock POST /api/auth/login — successful login returning the given user */
export async function mockLoginSuccess(page: Page, user: User = mockUsers.authenticated): Promise<void> {
    await page.route('**/api/auth/login', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user, csrfToken: 'new-csrf-token' }),
        }),
    );

    // Update /api/auth/me to return authenticated state after login
    await page.unroute('**/api/auth/me');
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user }),
        }),
    );
}

/** Mock POST /api/auth/login — failed login with error code */
export async function mockLoginError(
    page: Page,
    status: number,
    message: string,
    errorCode?: string,
): Promise<void> {
    await page.route('**/api/auth/login', route =>
        route.fulfill({
            status,
            json: apiError(message, errorCode),
        }),
    );
}

/** Mock POST /api/auth/logout — server error (logout still clears local state) */
export async function mockLogoutError(page: Page, status = 500): Promise<void> {
    await page.unroute('**/api/auth/logout');
    await page.route('**/api/auth/logout', route =>
        route.fulfill({
            status,
            json: apiError('Internal server error'),
        }),
    );
}

/** Mock a specific endpoint with a server error */
export async function mockApiError(page: Page, pattern: string, status: number, message: string): Promise<void> {
    await page.route(pattern, route =>
        route.fulfill({
            status,
            json: apiError(message),
        }),
    );
}
