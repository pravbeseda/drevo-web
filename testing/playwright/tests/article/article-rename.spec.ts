import {
    test,
    expect,
    mockAuthApi,
    mockArticleShow,
    mockArticleHistory,
    mockArticleRename,
    mockArticleRenameConflict,
    mockArticleRenameValidationError,
    mockArticlesApi,
    bypassSsr,
} from '../../fixtures';
import { getNotification } from '../../helpers/notification';
import { createArticleHistoryResponse, createArticleVersionDto } from '../../mocks/articles';
import { mockUsers } from '../../mocks/users';
import { ArticlePage } from '../../pages/article.page';
import { LayoutPage } from '../../pages/layout.page';

const ARTICLE_ID = 42;
const ARTICLE = createArticleVersionDto({ articleId: ARTICLE_ID, title: 'Старое название' });

test.describe('Article rename', () => {
    let layout: LayoutPage;

    test.describe('Moderator', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockAuthApi(page, mockUsers.moderator);
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            layout = new LayoutPage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await layout.waitForReady();
        });

        test('title is clickable and opens input', async () => {
            await layout.pageTitle.click();

            await expect(layout.pageTitleInput).toBeVisible();
            await expect(layout.pageTitleInput).toHaveValue('Старое название');
        });

        test('Enter saves and updates title', async ({ authenticatedPage: page }) => {
            await mockArticleRename(page, ARTICLE_ID, 'Новое название', 'Старое название');

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Новое название');
            await layout.pageTitleInput.press('Enter');

            await expect(layout.pageTitleInput).not.toBeVisible();
            await expect(layout.pageTitle).toHaveText('Новое название');
            await expect(getNotification(page, 'success')).toBeVisible();
        });

        test('Escape cancels without saving', async () => {
            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Изменённое');
            await layout.pageTitleInput.press('Escape');

            await expect(layout.pageTitleInput).not.toBeVisible();
            await expect(layout.pageTitle).toHaveText('Старое название');
        });

        test('blur saves the title', async ({ authenticatedPage: page }) => {
            await mockArticleRename(page, ARTICLE_ID, 'Новое', 'Старое название');

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Новое');
            await layout.hamburgerButton.click();

            await expect(layout.pageTitleInput).not.toBeVisible();
            await expect(getNotification(page, 'success')).toBeVisible();
        });

        test('shows error for duplicate title', async ({ authenticatedPage: page }) => {
            await mockArticleRenameConflict(page, ARTICLE_ID);

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Дубликат');
            await layout.pageTitleInput.press('Enter');

            await expect(getNotification(page, 'error')).toBeVisible();
            await expect(layout.pageTitleInput).toBeVisible();
        });

        test('shows server message for VALIDATION_ERROR', async ({ authenticatedPage: page }) => {
            await mockArticleRenameValidationError(page, ARTICLE_ID, 'Название совпадает с текущим');

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Новое');
            await layout.pageTitleInput.press('Enter');

            const notification = getNotification(page, 'error');
            await expect(notification).toBeVisible();
            await expect(notification).toContainText('Название совпадает с текущим');
            await expect(layout.pageTitleInput).toBeVisible();
        });

        test('updates document title after rename', async ({ authenticatedPage: page }) => {
            await mockArticleRename(page, ARTICLE_ID, 'Новое название', 'Старое название');
            await expect(page).toHaveTitle('Старое название - Древо');

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Новое название');
            await layout.pageTitleInput.press('Enter');

            await expect(page).toHaveTitle('Новое название - Древо');
        });

        test('preserves renamed title when switching to a tab', async ({ authenticatedPage: page }) => {
            await mockArticleRename(page, ARTICLE_ID, 'Новое название', 'Старое название');
            await mockArticleHistory(page, ARTICLE_ID, createArticleHistoryResponse([]));

            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('Новое название');
            await layout.pageTitleInput.press('Enter');
            await expect(page).toHaveTitle('Новое название - Древо');

            const article = new ArticlePage(page);
            await article.tabHistory.click();

            await expect(layout.pageTitle).toHaveText('История версий: Новое название');
            await expect(page).toHaveTitle('История версий: Новое название - Древо');
        });

        test('focuses and selects input content on open', async () => {
            await layout.pageTitle.click();

            await expect(layout.pageTitleInput).toBeFocused();
            // Typing replaces selection — input now holds only the new char
            await layout.pageTitleInput.pressSequentially('X');
            await expect(layout.pageTitleInput).toHaveValue('X');
        });

        test('browser enforces maxlength on input', async () => {
            await layout.pageTitle.click();
            await layout.pageTitleInput.fill('A'.repeat(300));

            const value = await layout.pageTitleInput.inputValue();
            expect(value.length).toBe(255);
        });

        test('title is not editable on an article tab', async ({ authenticatedPage: page }) => {
            await mockArticleHistory(page, ARTICLE_ID, createArticleHistoryResponse([]));

            const article = new ArticlePage(page);
            await article.tabHistory.click();
            await expect(layout.pageTitle).toHaveText('История версий: Старое название');
            await expect(layout.pageTitle).not.toHaveClass(/page-title--editable/);

            await layout.pageTitle.click();
            await expect(layout.pageTitleInput).not.toBeVisible();
        });

        test('editing disappears after navigating away from article', async ({ authenticatedPage: page }) => {
            await mockArticlesApi(page);

            await expect(layout.pageTitle).toHaveText('Старое название');
            await layout.pageTitle.click();
            await expect(layout.pageTitleInput).toBeVisible();
            await layout.pageTitleInput.press('Escape');

            await page.goto('/');
            await expect(page).toHaveURL('/');
            await expect(layout.pageTitle).toHaveText('Главная');

            await layout.pageTitle.click();
            await expect(layout.pageTitleInput).not.toBeVisible();
        });
    });

    test.describe('Regular user', () => {
        test('can see title but click does not open input', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            layout = new LayoutPage(page);
            await page.goto(`/articles/${ARTICLE_ID}`);
            await layout.waitForReady();

            await expect(layout.pageTitle).toHaveText('Старое название');
            await layout.pageTitle.click();
            await expect(layout.pageTitleInput).not.toBeVisible();
        });
    });
});
