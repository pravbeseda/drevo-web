import {
    test,
    expect,
    mockArticleShow,
    mockArticleShowNotFound,
    mockArticleShowError,
    mockArticleVersionShow,
    bypassSsr,
} from '../../fixtures';
import { createArticleVersionDto, mockArticleViewData } from '../../mocks/articles';
import { ArticlePage } from '../../pages/article.page';

const ARTICLE_ID = 42;
const VERSION_ID = 99;
const ARTICLE = mockArticleViewData.single;
const VERSION = mockArticleViewData.version;

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
        test('rejects a matrix address reached by an in-app link', async ({ authenticatedPage: page }) => {
            // The fresh-load case cannot reach this one: the router reuses the
            // resolver and the component when the merged params are unchanged,
            // which is exactly what a matrix value leaves them. The link comes
            // from article content, which is author-supplied, so this is also
            // how the address is reachable at all.
            const requestedIds: string[] = [];
            page.on('request', request => {
                const match = /\/api\/articles\/show\/(\d+)$/.exec(new URL(request.url()).pathname);
                if (match) requestedIds.push(match[1]);
            });
            await mockArticleShow(
                page,
                5,
                createArticleVersionDto({
                    articleId: 5,
                    versionId: 50,
                    title: 'ВИФСАИДА',
                    content: '<p><a href="/articles/9;id=5">ГОЛГОФА</a></p>',
                }),
            );
            await mockArticleShow(page, 9, createArticleVersionDto({ articleId: 9, versionId: 90, title: 'ГОЛГОФА' }));
            article = new ArticlePage(page);
            await page.goto('/articles/5');
            await article.waitForReady();

            await article.content.locator('a[href="/articles/9;id=5"]').click();
            await article.waitForError();

            await expect(article.error).toBeVisible();
            await expect(article.root).toBeHidden();
            expect(requestedIds).toEqual(['5']);
        });

        test('shows error for non-existent article (404)', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, '**/articles/999');
            await mockArticleShowNotFound(page, 999);
            article = new ArticlePage(page);
            await page.goto('/articles/999');
            await article.waitForError();

            await expect(article.error).toBeVisible();
            await expect(article.root).toBeHidden();
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

        test('displays author, date, and info in version banner', async () => {
            await expect(article.versionBanner).toContainText('Иван Петров');
            await expect(article.versionBanner).toContainText('20 марта 2025');
            await expect(article.versionBanner).toContainText('Исправлена опечатка');
        });

        test('shows link to current article version', async () => {
            const link = article.versionBanner.getByRole('link', { name: 'Перейти к текущей версии статьи' });
            await expect(link).toBeVisible();
            await expect(link).toHaveAttribute('href', `/articles/${ARTICLE_ID}`);
        });
    });
});
