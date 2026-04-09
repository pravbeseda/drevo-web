import {
    test,
    expect,
    bypassSsr,
    mockArticleShow,
    mockArticleVersion,
    mockArticleSave,
    mockArticleSaveError,
    mockArticlePreview,
    mockArticlePreviewError,
    mockInworkCheck,
    mockInworkMark,
    mockInworkClear,
} from '../../fixtures';
import { mockArticleViewData, mockArticleEditData } from '../../mocks/articles';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { getNotification } from '../../helpers/notification';

const ARTICLE_ID = 42;
const VERSION_ID = 420;
const ARTICLE = mockArticleViewData.single;
const VERSION = mockArticleEditData.version;

test.describe('Article edit', () => {
    let editPage: ArticleEditPage;

    test.describe('Editor page', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            await mockArticleVersion(page, VERSION_ID, VERSION);
            await mockInworkCheck(page);
            await mockInworkMark(page);
            await mockInworkClear(page);
            editPage = new ArticleEditPage(page);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
            await editPage.waitForReady();
        });

        test('loads the editor page', async () => {
            await expect(editPage.root).toBeVisible();
            await expect(editPage.editorContainer).toBeVisible();
        });

        test('shows info notification when saving unchanged content', async ({ authenticatedPage: page }) => {
            await editPage.clickSave();
            await expect(getNotification(page, 'info')).toContainText(
                'Нет изменений для сохранения',
            );
        });

        test('navigates to article page after successful save', async ({ authenticatedPage: page }) => {
            await mockArticleSave(page);
            await editPage.typeInEditor('Новый текст статьи');
            await editPage.clickSave();
            await page.waitForURL(`**/articles/${ARTICLE_ID}`);
        });

        test('shows error notification when save fails with server error', async ({ authenticatedPage: page }) => {
            await mockArticleSaveError(page, 500);
            await editPage.typeInEditor('Новый текст');
            await editPage.clickSave();
            await expect(getNotification(page, 'error')).toBeVisible();
        });

        test('shows 403 error notification when save is not authorized', async ({ authenticatedPage: page }) => {
            await mockArticleSaveError(page, 403, 'Нет прав для сохранения');
            await editPage.typeInEditor('Новый текст');
            await editPage.clickSave();
            await expect(getNotification(page, 'error')).toContainText(
                'Нет прав для сохранения',
            );
        });

        test('shows preview content on preview tab', async ({ authenticatedPage: page }) => {
            await mockArticlePreview(page, '<p>Превью статьи</p>');
            await editPage.clickPreviewTab();
            await expect(editPage.previewContent).toBeVisible();
        });

        test('shows error on preview tab when request fails', async ({ authenticatedPage: page }) => {
            await mockArticlePreviewError(page);
            await editPage.clickPreviewTab();
            await expect(editPage.previewError).toBeVisible();
        });
    });

    test.describe('Inwork', () => {
        test('shows warning dialog when another user is currently editing', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
            await mockArticleShow(page, ARTICLE_ID, ARTICLE);
            await mockArticleVersion(page, VERSION_ID, VERSION);
            await mockInworkCheck(page, 'другой пользователь');
            await mockInworkMark(page);
            await mockInworkClear(page);
            editPage = new ArticleEditPage(page);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
            await expect(page.getByTestId('confirmation-dialog-title')).toBeVisible();
            await expect(page.getByTestId('confirmation-dialog-title')).toContainText('Статья редактируется');
        });
    });
});
