import {
    test,
    expect,
    mockVersionPairs,
    mockVersionPairsNoHistory,
    mockVersionPairsServerError,
    bypassSsr,
} from '../../fixtures';
import { DiffPage } from '../../pages/diff.page';

const VERSION1 = 200;
const DIFF_URL_PATTERN = '**/history/articles/diff/**';

test.describe('Diff page', () => {
    test('shows version meta for single-version diff', async ({ authenticatedPage: page }) => {
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.meta).toBeVisible();
        await expect(diff.error).not.toBeVisible();
    });

    test('shows version meta for two-version diff', async ({ authenticatedPage: page }) => {
        const version2 = 199;
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${version2}/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.meta).toBeVisible();
        await expect(diff.error).not.toBeVisible();
    });

    test('toggle button switches diff type label', async ({ authenticatedPage: page }) => {
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        const getLabel = () => diff.toggleButton.getAttribute('aria-label');

        const initialLabel = await getLabel();
        await diff.toggleButton.click();
        await expect(async () => {
            const updatedLabel = await getLabel();
            expect(updatedLabel).not.toBe(initialLabel);
        }).toPass({ timeout: 5000 });
    });

    test('shows error when no previous version exists', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, DIFF_URL_PATTERN);
        await mockVersionPairsNoHistory(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.error).toBeVisible();
        await expect(diff.meta).not.toBeVisible();
    });

    test('shows error on server failure', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, DIFF_URL_PATTERN);
        await mockVersionPairsServerError(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.error).toBeVisible();
        await expect(diff.meta).not.toBeVisible();
    });

    test('shows error for invalid (non-numeric) version ID', async ({ authenticatedPage: page }) => {
        const diff = new DiffPage(page);
        await page.goto('/history/articles/diff/abc');
        await diff.waitForReady();

        await expect(diff.error).toBeVisible();
        await expect(diff.meta).not.toBeVisible();
    });
});
