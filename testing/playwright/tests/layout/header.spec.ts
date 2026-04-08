import { test, expect } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';
import { mockUsers } from '../../mocks';

test.describe('Header — account dropdown', () => {
    let layout: LayoutPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();
        await layout.openAccountMenu();
    });

    test('shows user name', async () => {
        await expect(layout.userName).toBeVisible();
        await expect(layout.userName).toHaveText(mockUsers.authenticated.name);
    });

    test('shows role label', async ({ authenticatedPage: page }) => {
        // role 'user' → 'Пользователь'
        await expect(page.getByText('Пользователь')).toBeVisible();
    });

    test('closes dropdown on Escape', async ({ authenticatedPage: page }) => {
        // CDK Menu handles Escape uniformly across all browsers
        await page.keyboard.press('Escape');
        await expect(layout.userName).not.toBeVisible();
    });

    test('shows download-logs and logout items', async ({ authenticatedPage: page }) => {
        await expect(layout.logoutButton).toBeVisible();
        await expect(page.getByText('Скачать логи')).toBeVisible();
    });
});
