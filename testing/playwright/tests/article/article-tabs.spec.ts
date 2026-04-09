import {
    test,
    expect,
    mockArticleShow,
    mockArticleVersionShow,
    mockArticleHistory,
    mockArticleHistoryError,
} from '../../fixtures';
import {
    createArticleHistoryResponse,
    mockArticleViewData,
} from '../../mocks/articles';
import { ArticlePage } from '../../pages/article.page';

const ARTICLE_ID = 42;
const VERSION_ID = 99;
const ARTICLE = mockArticleViewData.single;
const VERSION = mockArticleViewData.version;

test.describe('Article tabs', () => {
    let article: ArticlePage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);
        article = new ArticlePage(page);
        await page.goto(`/articles/${ARTICLE_ID}`);
        await article.waitForReady();
    });

    test.describe('Stub tabs', () => {
        test('news tab shows stub content', async () => {
            await article.tabNews.click();
            await expect(article.stub).toBeVisible();
        });

        test('forum tab shows stub content', async () => {
            await article.tabForum.click();
            await expect(article.stub).toBeVisible();
        });

        test('linkedhere tab shows stub content', async () => {
            await article.tabLinkedhere.click();
            await expect(article.stub).toBeVisible();
        });
    });

    test.describe('History tab', () => {
        test('shows empty state when no history items', async ({ authenticatedPage: page }) => {
            await mockArticleHistory(page, ARTICLE_ID, createArticleHistoryResponse([]));
            await article.tabHistory.click();
            await expect(article.historyEmpty).toBeVisible();
        });

        test('shows error when history fails to load', async ({ authenticatedPage: page }) => {
            await mockArticleHistoryError(page, ARTICLE_ID);
            await article.tabHistory.click();
            await expect(article.historyError).toBeVisible();
        });
    });

    test.describe('Version tab navigation', () => {
        test('clicking article tab from version route returns to content', async ({
            authenticatedPage: page,
        }) => {
            await mockArticleVersionShow(page, VERSION_ID, VERSION);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}`);
            await article.versionBanner.waitFor({ state: 'visible' });

            await article.tabArticle.click();
            await expect(article.content).toBeVisible();
            await expect(article.versionBanner).not.toBeVisible();
        });
    });

    test.describe('Direct URL navigation', () => {
        test('navigating directly to stub tab URL shows stub content', async ({
            authenticatedPage: page,
        }) => {
            await page.goto(`/articles/${ARTICLE_ID}/news`);
            await article.waitForReady();
            await expect(article.stub).toBeVisible();
        });
    });
});
