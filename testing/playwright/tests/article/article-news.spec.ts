import {
    test,
    expect,
    mockArticleCounts,
    mockArticleNewsApi,
    mockArticleShow,
    mockAuthApi,
    mockNewsTopicsApi,
} from '../../fixtures';
import { mockUsers } from '../../mocks';
import { mockArticleViewData } from '../../mocks/articles';
import { createNewsListItemDto, createNewsListResponse } from '../../mocks/news';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { ArticleNewsTabPage } from '../../pages/article-news-tab.page';
import { ArticlePage } from '../../pages/article.page';

const ARTICLE_ID = 42;
const ARTICLE = mockArticleViewData.single;
const PAGE_SIZE = 25;

test.describe('Article news tab', () => {
    let article: ArticlePage;
    let newsTab: ArticleNewsTabPage;
    let editor: ArticleEditPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);
        article = new ArticlePage(page);
        newsTab = new ArticleNewsTabPage(page);
        editor = new ArticleEditPage(page);
    });

    test('lists the news about the article, each opening its news item', async ({ authenticatedPage: page }) => {
        await mockArticleNewsApi(page, { articleId: ARTICLE_ID }, () =>
            createNewsListResponse([
                createNewsListItemDto({ title: 'Престольный праздник', newsDate: '2025-01-15' }, 7),
                createNewsListItemDto({ title: 'Освящение храма', newsDate: null }, 5),
            ]),
        );
        await page.goto(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();

        await expect(newsTab.items).toHaveCount(2);
        await expect(newsTab.list).toContainText('15 января 2025');

        await newsTab.item('Престольный праздник').click();
        await expect(page).toHaveURL('/news/7');
    });

    test('loads the next page of news as the reader scrolls', async ({ authenticatedPage: page }) => {
        const total = PAGE_SIZE + 5;
        await mockArticleNewsApi(page, { articleId: ARTICLE_ID }, pageNumber => {
            const first = (pageNumber - 1) * PAGE_SIZE + 1;
            const count = Math.min(PAGE_SIZE, total - first + 1);
            const items = Array.from({ length: count }, (_, i) => createNewsListItemDto({}, first + i));
            return createNewsListResponse(items, { total, page: pageNumber });
        });
        await page.goto(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();

        await expect(async () => {
            await newsTab.scrollToEnd();
            await expect(newsTab.item(`Новость ${total}`)).toBeVisible({ timeout: 500 });
        }).toPass();
    });

    test('says so when the article has no news', async ({ authenticatedPage: page }) => {
        await mockArticleNewsApi(page, { articleId: ARTICLE_ID }, () => createNewsListResponse([]));
        await page.goto(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();

        await expect(newsTab.empty).toBeVisible();
    });

    test('badges the news and discussion tabs with what they list, leaving an empty one bare', async ({
        authenticatedPage: page,
    }) => {
        await mockArticleCounts(page, ARTICLE_ID, { news: 3, forum: 0 });
        await page.goto(`/articles/${ARTICLE_ID}`);
        await article.waitForReady();

        await expect(article.badgeFor(article.tabNews)).toHaveText('3');
        await expect(article.badgeFor(article.tabForum)).toBeHidden();
    });

    test('adds a news item from the tab and returns to the tab on cancel', async ({ authenticatedPage: page }) => {
        await mockArticleNewsApi(page, { articleId: ARTICLE_ID }, () => createNewsListResponse([]));
        await mockNewsTopicsApi(page);
        await page.goto(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();

        await newsTab.addNewsAction.click();
        await expect(page).toHaveURL(`/articles/${ARTICLE_ID}/news/new`);
        await editor.waitForReady();
        await expect(article.tabNews).toBeVisible();

        await editor.clickCancel();
        await expect(page).toHaveURL(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();
    });
});

test.describe('Adding a news item without the right to edit', () => {
    const reader = {
        ...mockUsers.authenticated,
        permissions: { ...mockUsers.authenticated.permissions, canEdit: false },
    };

    test.beforeEach(async ({ page }) => {
        await mockAuthApi(page, reader);
        await mockNewsTopicsApi(page);
    });

    test("is not offered on the article's news tab, and its address lands back on the tab", async ({ page }) => {
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);
        await mockArticleNewsApi(page, { articleId: ARTICLE_ID }, () => createNewsListResponse([]));
        const newsTab = new ArticleNewsTabPage(page);

        await page.goto(`/articles/${ARTICLE_ID}/news/new`);

        await expect(page).toHaveURL(`/articles/${ARTICLE_ID}/news`);
        await newsTab.waitForReady();
        await expect(newsTab.addNewsAction).toBeHidden();
    });
});
