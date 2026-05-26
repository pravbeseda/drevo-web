import {
    test,
    expect,
    mockAuthApi,
    mockArticleShow,
    mockArticleVersionShow,
    mockArticleHistory,
    mockArticleCancelVersion,
    mockArticleCancelVersionConflict,
    bypassSsr,
} from '../../fixtures';
import type { Page } from '@playwright/test';
import {
    createArticleHistoryItemDto,
    createArticleHistoryResponse,
    createArticleVersionDto,
} from '../../mocks/articles';
import { mockUsers } from '../../mocks';
import { ArticlePage } from '../../pages/article.page';
import { getNotification } from '../../helpers/notification';

const ARTICLE_ID = 42;
const VERSION_ID = 99;

const author = mockUsers.authenticated;

function pendingVersionByAuthor(overrides = {}) {
    return createArticleVersionDto({
        articleId: ARTICLE_ID,
        versionId: VERSION_ID,
        title: 'Тестовая статья',
        author: author.name,
        approved: 0,
        ...overrides,
    });
}

async function gotoVersion(page: Page, article: ArticlePage): Promise<void> {
    await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}`);
    await article.waitForReady();
}

test.describe('Article cancel version — sidebar', () => {
    test.describe('Visibility', () => {
        test('cancel action visible for author of pending version', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, author);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();

            await expect(article.cancelVersionAction).toBeVisible();
        });

        test('cancel action hidden for non-author', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();

            await expect(article.cancelVersionAction).not.toBeVisible();
        });

        test('cancel action hidden for already-approved version', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, author);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor({ approved: 1 }));

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();

            await expect(article.cancelVersionAction).not.toBeVisible();
        });

        test('guests are redirected away from the version page (no cancel action)', async ({
            unauthenticatedPage: page,
        }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());

            const article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}`);
            await expect(page).toHaveURL(/\/login(\?|$)/);
            await expect(article.cancelVersionAction).not.toBeVisible();
        });
    });

    test.describe('Cancel flow', () => {
        test('happy path: confirms, updates status to cancelled, shows banner and success', async ({
            authenticatedPage: page,
        }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, author);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());
            await mockArticleCancelVersion(page, {
                versionId: VERSION_ID,
                articleId: ARTICLE_ID,
                approved: -2,
            });

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();
            await article.cancelVersionAction.click();
            await expect(article.cancelVersionDialogTitle).toBeVisible();
            await article.cancelVersionConfirmButton.click();

            await expect(getNotification(page, 'success')).toBeVisible();
            await expect(article.cancelledBanner).toBeVisible();
            await expect(article.versionBanner.locator('ui-status-icon.cancelled')).toBeVisible();
            // Action disappears because the version is no longer pending
            await expect(article.cancelVersionAction).not.toBeVisible();
        });

        test('dismissing the dialog does not call the API and keeps status', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, author);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());

            let apiCalled = false;
            await page.route('**/api/articles/cancel-version', route => {
                apiCalled = true;
                return route.fulfill({ status: 500, json: { success: false } });
            });

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();
            await article.cancelVersionAction.click();
            await expect(article.cancelVersionDialogTitle).toBeVisible();
            await article.cancelVersionDismissButton.click();

            expect(apiCalled).toBe(false);
            await expect(article.cancelledBanner).not.toBeVisible();
            await expect(article.cancelVersionAction).toBeVisible();
        });

        test('409 race: shows info notification and applies server-side actual status', async ({
            authenticatedPage: page,
        }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
            await mockAuthApi(page, author);
            await mockArticleShow(page, ARTICLE_ID);
            await mockArticleVersionShow(page, VERSION_ID, pendingVersionByAuthor());
            // Server says: moderator already approved it
            await mockArticleCancelVersionConflict(page, {
                versionId: VERSION_ID,
                articleId: ARTICLE_ID,
                approved: 1,
            });

            const article = new ArticlePage(page);
            await gotoVersion(page, article);
            await article.openMobileMenu();
            await article.cancelVersionAction.click();
            await expect(article.cancelVersionDialogTitle).toBeVisible();
            await article.cancelVersionConfirmButton.click();

            await expect(getNotification(page, 'info')).toBeVisible();
            await expect(article.cancelledBanner).not.toBeVisible();
            await expect(article.versionBanner.locator('ui-status-icon.approved')).toBeVisible();
        });
    });
});

test.describe('Article cancel version — history list', () => {
    const PENDING_ITEM = createArticleHistoryItemDto({
        versionId: VERSION_ID,
        articleId: ARTICLE_ID,
        author: author.name,
        approved: 0,
        title: 'Тестовая статья',
    });

    test('cancel button visible only for own pending item', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
        await mockAuthApi(page, author);
        await mockArticleShow(page, ARTICLE_ID);
        await mockArticleHistory(
            page,
            ARTICLE_ID,
            createArticleHistoryResponse([
                PENDING_ITEM,
                createArticleHistoryItemDto({
                    versionId: 100,
                    articleId: ARTICLE_ID,
                    author: 'someone else',
                    approved: 0,
                    title: 'Тестовая статья',
                }),
                createArticleHistoryItemDto({
                    versionId: 101,
                    articleId: ARTICLE_ID,
                    author: author.name,
                    approved: 1,
                    title: 'Тестовая статья',
                }),
            ]),
        );

        const article = new ArticlePage(page);
        await page.goto(`/articles/${ARTICLE_ID}/history`);
        await article.waitForReady();

        // Exactly one cancel button — for the user's own pending version
        await expect(article.historyCancelButton).toHaveCount(1);
    });

    test('cancel from list updates the row status', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/articles/${ARTICLE_ID}/**`);
        await mockAuthApi(page, author);
        await mockArticleShow(page, ARTICLE_ID);
        await mockArticleHistory(page, ARTICLE_ID, createArticleHistoryResponse([PENDING_ITEM]));
        await mockArticleCancelVersion(page, {
            versionId: VERSION_ID,
            articleId: ARTICLE_ID,
            approved: -2,
        });

        const article = new ArticlePage(page);
        await page.goto(`/articles/${ARTICLE_ID}/history`);
        await article.waitForReady();
        await article.historyCancelButton.click();
        await expect(article.cancelVersionDialogTitle).toBeVisible();
        await article.cancelVersionConfirmButton.click();

        await expect(getNotification(page, 'success')).toBeVisible();
        // Row updated: status icon switched to cancelled, cancel button gone
        await expect(page.locator('app-articles-history-item ui-status-icon.cancelled')).toBeVisible();
        await expect(article.historyCancelButton).toHaveCount(0);
    });
});
