import {
    test,
    expect,
    mockAuthApi,
    mockArticleShow,
    mockArticleModerate,
    mockVersionPairs,
    bypassSsr,
} from '../../fixtures';
import { createArticleVersionDto, createVersionPairsResponse } from '../../mocks/articles';
import { mockUsers } from '../../mocks';
import { ArticlePage } from '../../pages/article.page';
import { ModerationSheetPage } from '../../pages/moderation-sheet.page';
import { getNotification } from '../../helpers/notification';

const ARTICLE_ID = 42;

const PENDING_ARTICLE = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: 420,
    title: 'Тестовая статья',
    content: '<p>Содержимое тестовой статьи</p>',
    approved: 0,
    topics: [1],
});

const APPROVED_ARTICLE = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: 420,
    title: 'Тестовая статья',
    content: '<p>Содержимое тестовой статьи</p>',
    approved: 1,
    topics: [1],
});

const PENDING_ARTICLE_NO_TOPICS = createArticleVersionDto({
    articleId: ARTICLE_ID,
    versionId: 420,
    title: 'Тестовая статья',
    content: '<p>Содержимое тестовой статьи</p>',
    approved: 0,
    topics: [],
});

test.describe('Article moderation', () => {
    let article: ArticlePage;

    test.describe('Visibility', () => {
        test('moderation action hidden for regular user', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();

            await expect(article.moderationAction).toBeHidden();
        });

        test('moderation action visible for moderator', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();
            await article.openMobileMenu();

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
            await article.openMobileMenu();
            await article.moderationAction.click();
            await expect(article.moderationApproveButton).toBeVisible();
            await article.moderationApproveButton.click();
            await expect(getNotification(page, 'success')).toBeVisible();
        });

        test('moderator can reject a pending version', async ({ authenticatedPage: page }) => {
            await mockArticleModerate(page);
            await article.openMobileMenu();
            await article.moderationAction.click();
            await article.moderationRejectButton.click();
            await expect(getNotification(page, 'success')).toBeVisible();
        });

        test('the sheet shows the source of the version and checks it', async ({ authenticatedPage: page }) => {
            await mockVersionPairs(
                page,
                420,
                createVersionPairsResponse({ versionId: 420, content: 'Новый ихний дом.' }, { content: 'Старый дом.' }),
            );
            const sheet = new ModerationSheetPage(page);
            await article.openMobileMenu();
            await article.moderationAction.click();
            await sheet.waitForReady();

            await expect(sheet.editor).toBeVisible();
            await sheet.checkWholeText.click();
            await expect(sheet.findings).toHaveCount(1);
        });
    });

    test.describe('Disabled when no topics', () => {
        test('moderation action is disabled when article has no topics', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, PENDING_ARTICLE_NO_TOPICS);
            article = new ArticlePage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await article.waitForReady();
            await article.openMobileMenu();

            await expect(article.moderationAction).toBeVisible();
            await expect(article.moderationAction).toBeDisabled();
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
            await article.openMobileMenu();
            await article.moderationAction.click();

            await expect(article.moderationApproveButton).not.toBeAttached();
        });
    });
});
