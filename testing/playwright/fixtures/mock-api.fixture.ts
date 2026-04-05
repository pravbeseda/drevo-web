import { Page } from '@playwright/test';
import { User } from '@drevo-web/shared';
import { apiSuccess, mockUsers } from '../mocks';

/** Mock auth endpoints for an authenticated user */
export async function mockAuthApi(page: Page, user: User = mockUsers.authenticated): Promise<void> {
    await page.route('**/api/auth/me', (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { isAuthenticated: true, user },
            },
        }),
    );

    await page.route('**/api/auth/csrf', (route) =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );

    await page.route('**/api/auth/logout', (route) =>
        route.fulfill({ json: { success: true } }),
    );
}

/** Mock auth endpoints for an unauthenticated user */
export async function mockUnauthenticatedApi(page: Page): Promise<void> {
    await page.route('**/api/auth/me', (route) =>
        route.fulfill({
            json: {
                success: true,
                data: { isAuthenticated: false },
            },
        }),
    );

    await page.route('**/api/auth/csrf', (route) =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );
}

/** Mock a specific endpoint with a server error */
export async function mockApiError(
    page: Page,
    pattern: string,
    status: number,
    message: string,
): Promise<void> {
    await page.route(pattern, (route) =>
        route.fulfill({
            status,
            json: { success: false, error: message },
        }),
    );
}
