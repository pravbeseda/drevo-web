import { test, expect, mockNewsFeedApi, mockNewsHistory, mockNewsShow, mockNewsTopicsApi } from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse } from '../../mocks';
import { createNewsFeedItemDto, createNewsFeedResponse, createNewsVersionDto } from '../../mocks/news';
import { LayoutPage } from '../../pages/layout.page';
import { NewsPage } from '../../pages/news.page';

const NEWS_ID = 7;

test.describe('News', () => {
    let news: NewsPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockNewsTopicsApi(page);
        await mockNewsFeedApi(page, topic =>
            topic === '2'
                ? createNewsFeedResponse([createNewsFeedItemDto({ id: 8, title: 'Новость общества', topics: [2] })])
                : createNewsFeedResponse([
                      createNewsFeedItemDto({ id: NEWS_ID, title: 'Престольный праздник', topics: [1] }),
                      createNewsFeedItemDto({ id: 8, title: 'Новость общества', topics: [2] }),
                  ]),
        );
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

    test('the sidebar opens the news feed', async ({ authenticatedPage: page, isMobile }) => {
        const layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();
        await layout.openSidebarOnMobile(isMobile);

        await layout.navItem('Новости').click();

        await expect(page).toHaveURL(/\/news$/);
        await expect(news.feedItems).toHaveCount(2);
    });

    test('the feed opens a news item with its day, section and text', async ({ authenticatedPage: page }) => {
        await page.goto('/news');
        await news.waitForReady();

        await news.feedItem('Престольный праздник').click();

        await expect(page).toHaveURL(new RegExp(`/news/${NEWS_ID}$`));
        await expect(news.date).toHaveText('15 января 2025');
        await expect(news.sections).toHaveText(['Церковь']);
        await expect(news.content).toContainText('Текст о празднике');
    });

    test('the section filter narrows the feed to one section', async ({ authenticatedPage: page }) => {
        await page.goto('/news');
        await news.waitForReady();

        await news.filterButton.click();
        await news.filterOption(2).click();

        await expect(page).toHaveURL(/\/news\?topic=2$/);
        await expect(news.filterCurrent).toHaveText('Общество');
        await expect(news.feedItems).toHaveText(['Новость общества']);
    });

    test('a section of a news item opens the feed of that section', async ({ authenticatedPage: page }) => {
        await page.goto(`/news/${NEWS_ID}`);
        await news.waitForReady();

        await news.sections.first().click();

        await expect(page).toHaveURL(/\/news\?topic=1$/);
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
