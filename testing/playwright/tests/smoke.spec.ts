import { test, expect } from '../fixtures';
import { LayoutPage } from '../pages/layout.page';

test.describe('Smoke test', () => {
    test('authenticated user sees main page with header', async ({ authenticatedPage }) => {
        const layout = new LayoutPage(authenticatedPage);
        await authenticatedPage.goto('/');
        await layout.waitForLoaded();

        await expect(layout.header).toBeVisible();
        await layout.openAccountMenu();
        await expect(layout.userName).toHaveText('Test User');
    });
});
