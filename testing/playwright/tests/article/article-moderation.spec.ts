import { test, expect, mockAuthApi, mockArticleShow, mockArticleModerate, bypassSsr } from '../../fixtures';
import { createArticleVersionDto, mockArticleViewData } from '../../mocks/articles';
import { mockUsers } from '../../mocks';
import { ArticlePage } from '../../pages/article.page';

const ARTICLE_ID = 42;

const PENDING_ARTICLE = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: 420,
    title: 'Тестовая статья',
    content: '<p>Содержимое тестовой статьи</p>',
    approved: 0,
});

const APPROVED_ARTICLE = mockArticleViewData.single;

test.describe('Article moderation', () => {
    let article: ArticlePage;

    test.describe('Visibility', () => {
        test('moderation action hidden for regular user', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();

            await expect(article.moderationAction).not.toBeVisible();
        });

        test('moderation action visible for moderator', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();

            await expect(article.moderationAction).toBeVisible();
        });
    });

    test.describe('Moderation actions', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();
        });

        test('moderator can approve a pending version', async ({ authenticatedPage: page }) => {
            await mockArticleModerate(page);
            await article.moderationAction.click();
            await expect(article.moderationApproveButton).toBeVisible();
            await article.moderationApproveButton.click();
            await expect(page.locator('.mat-mdc-snack-bar-container.toast-success')).toBeVisible();
        });

        test('moderator can reject a pending version', async ({ authenticatedPage: page }) => {
            await mockArticleModerate(page);
            await article.moderationAction.click();
            await article.moderationRejectButton.click();
            await expect(page.locator('.mat-mdc-snack-bar-container.toast-success')).toBeVisible();
        });
    });

    test.describe('Approved version', () => {
        test('approve button not rendered for already-approved version', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, APPROVED_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();
            await article.moderationAction.click();

            await expect(article.moderationApproveButton).not.toBeAttached();
        });
    });
});
