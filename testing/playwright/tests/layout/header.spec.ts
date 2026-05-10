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

    test('shows role label', async () => {
        await expect(layout.userRole).toBeVisible();
        await expect(layout.userRole).toHaveText('Пользователь');
    });

    test('closes dropdown on Escape', async () => {
        await layout.closeAccountMenu();
        await expect(layout.userName).not.toBeVisible();
    });

    test('shows download-logs and logout items', async () => {
        await expect(layout.logoutButton).toBeVisible();
        await expect(layout.downloadLogsButton).toBeVisible();
    });
});
