import { test, expect, mockNewsHistory, mockNewsShow, mockNewsTopicsApi } from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse } from '../../mocks';
import { createNewsVersionDto } from '../../mocks/news';
import { LayoutPage } from '../../pages/layout.page';
import { NewsPage } from '../../pages/news.page';

const NEWS_ID = 7;

test.describe('News', () => {
    let news: NewsPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockNewsTopicsApi(page);
        await mockNewsShow(
            page,
            NEWS_ID,
            createNewsVersionDto(
                { title: 'Престольный праздник', content: '<p>Текст о празднике</p>', newsDate: '2025-01-15' },
                NEWS_ID,
            ),
        );
        news = new NewsPage(page);
    });

    test('the sidebar offers no news section: the news are in the history', async ({
        authenticatedPage: page,
        isMobile,
    }) => {
        const layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();
        await layout.openSidebarOnMobile(isMobile);

        await expect(layout.navItem('Изменения')).toBeVisible();
        await expect(layout.navItem('Новости')).toHaveCount(0);
    });

    test('the bare /news lands on the news history', async ({ authenticatedPage: page }) => {
        await mockNewsHistory(page, createArticleHistoryResponse([]));

        await page.goto('/news');

        await expect(page).toHaveURL(/\/history\/news$/);
    });

    test('a news item shows its day, section and text', async ({ authenticatedPage: page }) => {
        await page.goto(`/news/${NEWS_ID}`);
        await news.waitForReady();

        await expect(news.date).toHaveText('15 января 2025');
        await expect(news.sections).toHaveText(['Церковь']);
        await expect(news.content).toContainText('Текст о празднике');
    });

    test('the versions tab lists the versions of the news item', async ({ authenticatedPage: page }) => {
        await mockNewsHistory(
            page,
            createArticleHistoryResponse([
                createArticleHistoryItemDto({ versionId: 71, articleId: NEWS_ID, title: 'Престольный праздник' }, 71),
            ]),
            NEWS_ID,
        );
        await page.goto(`/news/${NEWS_ID}`);
        await news.waitForReady();

        await news.tabHistory.click();

        await expect(news.historyRows).toHaveCount(1);
        await expect(news.historyRowLinks).toHaveAttribute('href', `/news/${NEWS_ID}/version/71`);
    });

    test('the news tab of the history lists news versions', async ({ authenticatedPage: page }) => {
        await mockNewsHistory(
            page,
            createArticleHistoryResponse([
                createArticleHistoryItemDto({ versionId: 71, articleId: NEWS_ID, title: 'Престольный праздник' }, 71),
            ]),
        );

        await page.goto('/history/news');

        await expect(news.historyRowLinks).toHaveAttribute('href', `/news/${NEWS_ID}/version/71`);
    });
});
