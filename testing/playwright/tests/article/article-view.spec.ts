import {
    test,
    expect,
    mockArticleShow,
    mockArticleShowNotFound,
    mockArticleShowError,
    mockArticleVersionShow,
    bypassSsr,
} from '../../fixtures';
import { createArticleVersionDto } from '../../mocks/articles';
import { ArticlePage } from '../../pages/article.page';

const ARTICLE_ID = 42;
const VERSION_ID = 99;
const ARTICLE = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: 420,
    title: 'Тестовая статья',
    content: '<p>Содержимое тестовой статьи</p>',
});
const VERSION = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: VERSION_ID,
    title: 'Тестовая статья',
    approved: 0,
});

test.describe('Article view', () => {
    let article: ArticlePage;

    test.describe('Display', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();
        });

        test('shows article root element', async () => {
            await expect(article.root).toBeVisible();
        });

        test('shows article content tab by default', async () => {
            await expect(article.content).toBeVisible();
        });

        test('shows all 5 tab links', async () => {
            await expect(article.tabArticle).toBeVisible();
            await expect(article.tabNews).toBeVisible();
            await expect(article.tabForum).toBeVisible();
            await expect(article.tabHistory).toBeVisible();
            await expect(article.tabLinkedhere).toBeVisible();
        });
    });

    test.describe('Error states', () => {
        test('shows error for non-existent article (404)', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, '**/articles/999');
            await mockArticleShowNotFound(page, 999);
            article = new ArticlePage(page);
            await page.goto('/articles/999');
            await article.waitForError();

            await expect(article.error).toBeVisible();
            await expect(article.root).not.toBeVisible();
        });

        test('shows error for server failure (500)', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockArticleShowError(page, ARTICLE_ID);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForError();

            await expect(article.error).toBeVisible();
        });

        test('shows error for invalid (non-numeric) article ID', async ({ authenticatedPage: page }) => {
            // Resolver guards isNaN before making HTTP call — no mock needed
            article = new ArticlePage(page);
            await page.goto('/articles/not-a-number');
            await article.waitForError();

            await expect(article.error).toBeVisible();
        });
    });

    test.describe('Version tab', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            await mockArticleVersionShow(page, VERSION_ID, VERSION);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}`);
            await article.versionBanner.waitFor({ state: 'visible' });
        });

        test('shows version banner for specific version', async () => {
            await expect(article.versionBanner).toBeVisible();
        });
    });
});
