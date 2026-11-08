import { test, expect, mockGlobalHistory, mockGlobalHistoryError } from '../../fixtures';
import { createArticleHistoryResponse } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

test.describe('History page', () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page);
        await page.goto('/history/articles');
    });

    test('/history redirects to /history/articles', async ({ authenticatedPage: page }) => {
        await page.goto('/history');
        await expect(page).toHaveURL(/\/history\/articles/);
    });

    test('/history/forum is a not-found page', async ({ authenticatedPage: page }) => {
        await page.goto('/history/forum');
        await expect(page).toHaveTitle(/Страница не найдена/);
    });

    test('shows history list on load', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();
        await expect(history.historyList).toBeVisible();
    });

    test('shows empty state when no items', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page, createArticleHistoryResponse([]));
        await page.goto('/history/articles');
        const history = new HistoryPage(page);
        await history.waitForReady();
        await expect(history.historyEmpty).toBeVisible();
    });

    test('shows error on API failure', async ({ authenticatedPage: page }) => {
        await mockGlobalHistoryError(page);
        await page.goto('/history/articles');
        const history = new HistoryPage(page);
        await history.waitForReady();
        await expect(history.historyError).toBeVisible();
    });

    test('clicking news tab navigates to /history/news', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();
        await history.tabNews.click();
        await expect(page).toHaveURL(/\/history\/news/);
    });

    test('tabs keep their content width instead of filling the row', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();
        await expect(history.tabArticles).toHaveCSS('flex-grow', '0');
    });

    test('clicking pictures tab navigates to /history/pictures', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();

        // On mobile, mat-tab-nav-bar's pagination arrow overlays the last tab.
        // Use DOM click to bypass the overlay.
        await history.tabPictures.dispatchEvent('click');

        await expect(page).toHaveURL(/\/history\/pictures/);
    });
});
