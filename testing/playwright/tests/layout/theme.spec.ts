import { test, expect } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

const THEME_KEY = 'drevo-theme';

test.describe('Theme toggle', () => {
    let layout: LayoutPage;

    test.describe('Toggle', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
        });

        test('applies dark theme on click', async ({ authenticatedPage: page }) => {
            await layout.themeToggle.click();
            await expect(page.locator('html')).toHaveClass(/dark-theme/);
        });

        test('returns to light theme on second click', async ({ authenticatedPage: page }) => {
            await layout.themeToggle.click();
            await layout.themeToggle.click();
            await expect(page.locator('html')).not.toHaveClass(/dark-theme/);
            await expect(page.locator('html')).toHaveClass(/light-theme/);
        });
    });

    test.describe('Persistence', () => {
        test('saves dark theme to localStorage', async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.themeToggle.click();
            // ThemeService uses an effect() that is async in zoneless mode.
            // Wait for the DOM class change (same effect) before reading localStorage.
            await expect(page.locator('html')).toHaveClass(/dark-theme/);

            const value = await page.evaluate(key => localStorage.getItem(key), THEME_KEY);
            expect(value).toBe('dark');
        });

        test('restores dark theme from localStorage', async ({ authenticatedPage: page }) => {
            await page.addInitScript(key => {
                localStorage.setItem(key, 'dark');
            }, THEME_KEY);

            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await expect(page.locator('html')).toHaveClass(/dark-theme/);
        });
    });
});
