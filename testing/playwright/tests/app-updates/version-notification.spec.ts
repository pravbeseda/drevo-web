import { expect, test } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

test.describe('Version update notification', () => {
    test('shows snackbar when version.json changes', async ({ authenticatedPage: page }) => {
        const layout = new LayoutPage(page);

        await page.clock.install({ time: new Date('2026-04-20T12:00:00Z') });

        await page.route('**/assets/version.json*', route =>
            route.fulfill({
                json: { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' },
            }),
        );

        await page.goto('/');
        await layout.waitForReady();
        await page.waitForLoadState('networkidle');

        await page.unroute('**/assets/version.json*');
        await page.route('**/assets/version.json*', route =>
            route.fulfill({
                json: { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' },
            }),
        );

        await page.clock.fastForward(5 * 60 * 1000);

        await expect(page.getByText('Доступна новая версия 1.1.0')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('button', { name: 'Обновить' })).toBeVisible();
    });

    test('reloads page on snackbar action click', async ({ authenticatedPage: page }) => {
        const layout = new LayoutPage(page);

        await page.clock.install({ time: new Date('2026-04-20T12:00:00Z') });

        await page.route('**/assets/version.json*', route =>
            route.fulfill({
                json: { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' },
            }),
        );

        await page.goto('/');
        await layout.waitForReady();
        await page.waitForLoadState('networkidle');

        await page.unroute('**/assets/version.json*');
        await page.route('**/assets/version.json*', route =>
            route.fulfill({
                json: { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' },
            }),
        );

        await page.clock.fastForward(5 * 60 * 1000);

        await expect(page.getByText('Доступна новая версия 1.1.0')).toBeVisible({ timeout: 10000 });

        await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Обновить' }).click()]);

        await expect(page.getByText('Доступна новая версия 1.1.0')).toHaveCount(0);
    });

    test('does not show snackbar when version is the same', async ({ authenticatedPage: page }) => {
        const layout = new LayoutPage(page);

        await page.clock.install({ time: new Date('2026-04-20T12:00:00Z') });

        await page.route('**/assets/version.json*', route =>
            route.fulfill({
                json: { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' },
            }),
        );

        await page.goto('/');
        await layout.waitForReady();
        await page.waitForLoadState('networkidle');

        await page.clock.fastForward(5 * 60 * 1000);

        await page.waitForTimeout(500);
        await expect(page.getByText(/Доступна новая версия/)).toHaveCount(0);
    });
});
