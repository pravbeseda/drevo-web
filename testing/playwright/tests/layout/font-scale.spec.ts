import { test, expect } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

const FONT_SCALE_KEY = 'drevo-font-scale';

// Steps to reach min (0.8) from default (1.0): 2 clicks
const STEPS_TO_MIN = 2;
// Steps to reach max (1.5) from default (1.0): 5 clicks
const STEPS_TO_MAX = 5;

test.describe('Font scale control', () => {
    let layout: LayoutPage;

    test.describe('Popup', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
        });

        test('opens popup on button click', async () => {
            await layout.openFontScalePopup();
            await expect(layout.fontScalePopup).toBeVisible();
        });

        test('closes popup on backdrop click', async ({ authenticatedPage: page }) => {
            await layout.openFontScalePopup();
            await page.locator('.font-scale-backdrop').click({ force: true });
            await expect(layout.fontScalePopup).not.toBeVisible();
        });
    });

    test.describe('Stepper', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
            await layout.openFontScalePopup();
        });

        test('shows default scale 100%', async () => {
            await expect(layout.fontScaleValue).toHaveText('100%');
        });

        test('increases scale on + click', async () => {
            await layout.fontScaleIncrease.click();
            await expect(layout.fontScaleValue).toHaveText('110%');
        });

        test('decreases scale on − click after increase', async () => {
            await layout.fontScaleIncrease.click();
            await layout.fontScaleDecrease.click();
            await expect(layout.fontScaleValue).toHaveText('100%');
        });

        test('decrease button is disabled at minimum (80%)', async () => {
            for (let i = 0; i < STEPS_TO_MIN; i++) {
                await layout.fontScaleDecrease.click();
            }
            await expect(layout.fontScaleValue).toHaveText('80%');
            // ui-icon-button renders a native <button> inside — check that for disabled state
            await expect(layout.fontScaleDecreaseButton).toBeDisabled();
        });

        test('increase button is disabled at maximum (150%)', async () => {
            for (let i = 0; i < STEPS_TO_MAX; i++) {
                await layout.fontScaleIncrease.click();
            }
            await expect(layout.fontScaleValue).toHaveText('150%');
            // ui-icon-button renders a native <button> inside — check that for disabled state
            await expect(layout.fontScaleIncreaseButton).toBeDisabled();
        });

        test('reset returns to 100%', async () => {
            await layout.fontScaleIncrease.click();
            await layout.fontScaleReset.click();
            await expect(layout.fontScaleValue).toHaveText('100%');
        });

        test('reset button is disabled at default scale', async () => {
            // ui-button renders a native <button> inside — check that for disabled state
            await expect(layout.fontScaleResetButton).toBeDisabled();
        });
    });

    test.describe('Persistence', () => {
        test('saves scale to localStorage after increase', async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
            await layout.openFontScalePopup();

            await layout.fontScaleIncrease.click();
            // FontScaleService uses an effect() that is async in zoneless mode.
            // Wait for the DOM value update (same effect) before reading localStorage.
            await expect(layout.fontScaleValue).toHaveText('110%');

            const value = await page.evaluate(key => localStorage.getItem(key), FONT_SCALE_KEY);
            expect(value).toBe('1.1');
        });

        test('restores scale from localStorage', async ({ authenticatedPage: page }) => {
            await page.addInitScript(key => {
                localStorage.setItem(key, '1.2');
            }, FONT_SCALE_KEY);

            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
            await layout.openFontScalePopup();

            await expect(layout.fontScaleValue).toHaveText('120%');
        });

        test('removes localStorage key when reset to default', async ({ authenticatedPage: page }) => {
            await page.addInitScript(key => {
                localStorage.setItem(key, '1.2');
            }, FONT_SCALE_KEY);

            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
            await layout.openFontScalePopup();

            await layout.fontScaleReset.click();
            // Wait for DOM update before checking localStorage
            await expect(layout.fontScaleValue).toHaveText('100%');

            const value = await page.evaluate(key => localStorage.getItem(key), FONT_SCALE_KEY);
            expect(value).toBeNull();
        });
    });
});
