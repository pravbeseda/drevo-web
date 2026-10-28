import {
    test,
    expect,
    mockVersionPairs,
    mockVersionPairsNoHistory,
    mockVersionPairsServerError,
    bypassSsr,
} from '../../fixtures';
import { DiffPage } from '../../pages/diff.page';
import { LayoutPage } from '../../pages/layout.page';

const VERSION1 = 200;
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const DIFF_URL_PATTERN = '**/history/articles/diff/**';

test.describe('Diff page', () => {
    test('shows version meta for single-version diff', async ({ authenticatedPage: page }) => {
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.meta).toBeVisible();
        await expect(diff.error).toBeHidden();
    });

    test('shows version meta for two-version diff', async ({ authenticatedPage: page }) => {
        const version2 = 199;
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${version2}/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.meta).toBeVisible();
        await expect(diff.error).toBeHidden();
    });

    test('colours the changed words like the JsDiff view, not the whole line', async ({ authenticatedPage: page }) => {
        await mockVersionPairs(page, VERSION1);
        const diff = new DiffPage(page);
        const layout = new LayoutPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();
        const colors = await layout.readColors([
            '--themed-diff-insert-bg',
            '--themed-diff-insert-text',
            '--themed-diff-delete-bg',
        ]);

        await expect(diff.changedLine).toHaveCSS('background-color', TRANSPARENT);
        await expect(diff.changedText).toHaveCSS('background-color', colors['--themed-diff-insert-bg']);
        await expect(diff.deletedText).toHaveCSS('background-color', colors['--themed-diff-delete-bg']);
        await expect(diff.deletedText).toHaveCSS('text-decoration-line', 'line-through');
        await expect(diff.changeMarker).toHaveCSS('background-color', colors['--themed-diff-insert-text']);
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
        await expect(diff.meta).toBeHidden();
    });

    test('shows error on server failure', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, DIFF_URL_PATTERN);
        await mockVersionPairsServerError(page, VERSION1);
        const diff = new DiffPage(page);
        await page.goto(`/history/articles/diff/${VERSION1}`);
        await diff.waitForReady();

        await expect(diff.error).toBeVisible();
        await expect(diff.meta).toBeHidden();
    });

    test('shows error for invalid (non-numeric) version ID', async ({ authenticatedPage: page }) => {
        const diff = new DiffPage(page);
        await page.goto('/history/articles/diff/abc');
        await diff.waitForReady();

        await expect(diff.error).toBeVisible();
        await expect(diff.meta).toBeHidden();
    });
});
