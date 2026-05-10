import { test, expect, mockAuthApi, mockGlobalHistory, mockHistoryCounts } from '../../fixtures';
import { mockUsers } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

test.describe('History tab badges', () => {
    test('moderator sees badges with pending counts', async ({ page }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await mockGlobalHistory(page);
        await mockHistoryCounts(page, { pendingArticles: 5, pendingNews: 2, pendingPictures: 0 });

        await page.goto('/history/articles');
        const history = new HistoryPage(page);
        await history.waitForReady();

        await expect(history.badgeFor(history.tabArticles)).toHaveText('5');
        await expect(history.badgeFor(history.tabNews)).toHaveText('2');
        await expect(history.badgeFor(history.tabForum)).not.toBeVisible();
        await expect(history.badgeFor(history.tabPictures)).not.toBeVisible();
    });

    test('regular user does not see badges', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page);
        await mockHistoryCounts(page, { pendingArticles: 5, pendingNews: 2, pendingPictures: 3 });

        await page.goto('/history/articles');
        const history = new HistoryPage(page);
        await history.waitForReady();

        await expect(history.badgeFor(history.tabArticles)).not.toBeVisible();
        await expect(history.badgeFor(history.tabNews)).not.toBeVisible();
        await expect(history.badgeFor(history.tabPictures)).not.toBeVisible();
    });

    test('moderator sees no badges when all counts are zero', async ({ page }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await mockGlobalHistory(page);
        await mockHistoryCounts(page, { pendingArticles: 0, pendingNews: 0, pendingPictures: 0 });

        await page.goto('/history/articles');
        const history = new HistoryPage(page);
        await history.waitForReady();

        await expect(history.badgeFor(history.tabArticles)).not.toBeVisible();
        await expect(history.badgeFor(history.tabNews)).not.toBeVisible();
        await expect(history.badgeFor(history.tabPictures)).not.toBeVisible();
    });
});
