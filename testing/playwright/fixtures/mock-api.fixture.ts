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

/** Mock a specific endpoint with a server error */
export async function mockApiError(page: Page, pattern: string, status: number, message: string): Promise<void> {
    await page.route(pattern, route =>
        route.fulfill({
            status,
            json: apiError(message),
        }),
    );
}
