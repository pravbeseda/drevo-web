import { expect, test } from '../../fixtures';

test.describe('Auth guard', () => {
    test.describe('Unauthenticated user', () => {
        test('redirects to /login when accessing protected route', async ({ unauthenticatedPage: page }) => {
            await page.goto('/');

            await expect(page).toHaveURL(/\/login/);
            const returnUrl = new URL(page.url()).searchParams.get('returnUrl');
            expect(returnUrl).toBe('/');
        });

        test('preserves returnUrl in redirect', async ({ unauthenticatedPage: page }) => {
            await page.goto('/articles/5');

            await expect(page).toHaveURL(/\/login/);
            const returnUrl = new URL(page.url()).searchParams.get('returnUrl');
            expect(returnUrl).toBe('/articles/5');
        });
    });

    test.describe('Authenticated user', () => {
        test('allows access to protected route', async ({ authenticatedPage: page }) => {
            await page.goto('/');

            await expect(page).toHaveURL('/');
        });
    });
});
