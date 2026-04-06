import { expect, mockLogoutError, test } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

test.describe('Logout', () => {
    let layout: LayoutPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();
    });

    test('redirects to /login after successful logout', async ({ authenticatedPage: page }) => {
        await layout.clickLogout();

        await expect(page).toHaveURL('/login');
    });

    test('redirects to /login even when logout request fails', async ({ authenticatedPage: page }) => {
        await mockLogoutError(page);
        await layout.clickLogout();

        await expect(page).toHaveURL('/login');
    });
});
