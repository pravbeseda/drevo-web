import { expect, test } from '../../fixtures';
import { EditorPage } from '../../pages/editor.page';

test.describe('Editor page', () => {
    test('redirects unauthenticated user to /login', async ({ unauthenticatedPage: page }) => {
        await page.goto('/editor');

        await expect(page).toHaveURL(/\/login/);
    });

    test('shows skeleton while waiting for iframe content', async ({ authenticatedPage: page }) => {
        await page.goto('/editor');
        const editor = new EditorPage(page);
        await editor.waitForReady();

        await expect(editor.skeleton).toBeVisible();
    });
});
