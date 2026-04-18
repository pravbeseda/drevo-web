import { test, expect, mockPicturesApi, mockPictureThumbs } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

test.describe('Chunk reload prompt', () => {
    test('shows overlay when a lazy chunk fails to load and reloads on click', async ({
        authenticatedPage: page,
    }) => {
        const layout = new LayoutPage(page);

        // Load the shell so the initial bundle is already in the browser.
        await page.goto('/');
        await layout.waitForReady();
        await page.waitForLoadState('networkidle');

        // Simulate post-deploy state: any further lazy JS chunk request 404s.
        // Only lazy chunks (chunk-*.js) are blocked; initial bundle / polyfills are
        // left intact so the shell keeps working.
        await page.route('**/chunk-*.js', route => route.abort());

        // SPA navigation to a lazy feature route → dynamic import fails →
        // Angular Router emits NavigationError → ChunkErrorHandler / NavigationError
        // subscription flips AppUpdateService.chunkLoadFailed to true.
        const picturesNav = layout.navItem('Иллюстрации');
        await picturesNav.click();

        const overlay = page.getByTestId('reload-prompt');
        await expect(overlay).toBeVisible();
        await expect(page.locator('app-reload-prompt')).toHaveAttribute('role', 'alertdialog');
        await expect(overlay).toContainText('Приложение обновилось');
        await expect(overlay).toContainText(
            'Откройте новую версию, чтобы продолжить работу. Ваши несохранённые изменения могут быть потеряны.',
        );

        const reloadButton = page.getByTestId('reload-button');
        await expect(reloadButton).toBeVisible();
        await expect(reloadButton).toContainText('Обновить');

        // Restore network and the mocks needed for the reloaded page.
        await page.unroute('**/chunk-*.js');
        await mockPictureThumbs(page);
        await mockPicturesApi(page);

        // Click "Обновить" → full page reload.
        await Promise.all([page.waitForEvent('load'), reloadButton.click()]);

        // After reload the overlay must not be present on a fresh page.
        await expect(page.getByTestId('reload-prompt')).toHaveCount(0);
    });

    test('does not show overlay on normal navigation', async ({ authenticatedPage: page }) => {
        await mockPictureThumbs(page);
        await mockPicturesApi(page);

        const layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();

        await layout.navItem('Иллюстрации').click();
        await page.waitForURL('**/pictures');

        await expect(page.getByTestId('reload-prompt')).toHaveCount(0);
    });
});
