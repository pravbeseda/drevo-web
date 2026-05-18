import {
    test,
    expect,
    mockAuthApi,
    mockArticleShow,
    mockArticleRename,
    mockArticleRenameConflict,
    bypassSsr,
} from '../../fixtures';
import { getNotification } from '../../helpers/notification';
import { createArticleVersionDto } from '../../mocks/articles';
import { mockUsers } from '../../mocks/users';
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
    });

    test.describe('Regular user', () => {
        test('can see title but click does not open input', async ({ authenticatedPage: page }) => {
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
