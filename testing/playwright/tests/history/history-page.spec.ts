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

    test('clicking forum tab navigates to /history/forum', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();
        await history.tabForum.click();
        await expect(page).toHaveURL(/\/history\/forum/);
    });

    test('clicking pictures tab navigates to /history/pictures', async ({ authenticatedPage: page }) => {
        const history = new HistoryPage(page);
        await history.waitForReady();
        await history.tabPictures.dispatchEvent('click');
        await expect(page).toHaveURL(/\/history\/pictures/);
    });
});
