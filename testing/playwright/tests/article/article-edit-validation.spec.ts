import {
    test,
    expect,
    bypassSsr,
    mockArticleVersion,
    mockArticleSave,
    mockInworkCheck,
    mockInworkMark,
    mockInworkClear,
    mockArticleShow,
} from '../../fixtures';
import { createArticleVersionDto, mockArticleViewData } from '../../mocks/articles';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { getConfirmationDialogTitle } from '../../helpers/confirmation-dialog';

const ARTICLE_ID = 42;
const VERSION_ID = 420;
const ARTICLE = mockArticleViewData.single;

function versionWith(content: string) {
    return createArticleVersionDto({
        articleId: ARTICLE_ID,
        versionId: VERSION_ID,
        title: 'Тестовая статья',
        content,
        approved: 0,
    });
}

async function setupEditPage(page: import('@playwright/test').Page, content: string): Promise<ArticleEditPage> {
    await bypassSsr(page, `**/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
    await mockArticleShow(page, ARTICLE_ID, ARTICLE);
    await mockArticleVersion(page, VERSION_ID, versionWith(content));
    await mockInworkCheck(page);
    await mockInworkMark(page);
    await mockInworkClear(page);
    const editPage = new ArticleEditPage(page);
    await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}/edit`);
    await editPage.waitForReady();
    return editPage;
}

test.describe('Article edit — validation', () => {
    test.describe('Validation indicator', () => {
        test('shows check icon when content is valid', async ({ authenticatedPage: page }) => {
            await setupEditPage(page, 'Обычный текст');
            const indicator = page.getByTestId('validation-indicator');

            await expect(indicator).toBeVisible();
            await expect(indicator).toHaveClass(/validation-indicator--ok/);
        });

        test('shows warning count when content has warnings', async ({ authenticatedPage: page }) => {
            await setupEditPage(page, '== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');

            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);
            const warningSpan = indicator.locator('.validation-indicator__warning');
            await expect(warningSpan).toBeVisible();
            await expect(warningSpan).toContainText('1');
        });

        test('updates count for multiple warnings', async ({ authenticatedPage: page }) => {
            await setupEditPage(page, '== ((one)) ((two)) ==');
            const indicator = page.getByTestId('validation-indicator');

            const warningSpan = indicator.locator('.validation-indicator__warning');
            await expect(warningSpan).toBeVisible();
            await expect(warningSpan).toContainText('2');
        });

        test('shows warning count for bracket issues', async ({ authenticatedPage: page }) => {
            await setupEditPage(page, 'текст (без закрытия');
            const indicator = page.getByTestId('validation-indicator');

            const warningSpan = indicator.locator('.validation-indicator__warning');
            await expect(warningSpan).toBeVisible();
        });

        test('returns to ok state when content is fixed', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await editPage.typeInEditor('Чистый текст без проблем');
            await expect(indicator).toHaveClass(/validation-indicator--ok/);
        });
    });

    test.describe('Save with warnings', () => {
        test('shows confirmation dialog when saving content with warnings', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, 'Чистый текст');
            await editPage.typeInEditor('== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await editPage.clickSave();

            const dialogTitle = getConfirmationDialogTitle(page);
            await expect(dialogTitle).toBeVisible();
            await expect(dialogTitle).toContainText('Предупреждения в тексте');
        });

        test('saves after user confirms warnings', async ({ authenticatedPage: page }) => {
            await mockArticleSave(page);
            const editPage = await setupEditPage(page, 'Чистый текст');
            await editPage.typeInEditor('== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await editPage.clickSave();

            const confirmButton = page.getByTestId('confirmation-dialog-confirm');
            await confirmButton.click();

            await page.waitForURL(`**/articles/${ARTICLE_ID}`);
        });

        test('does not save when user cancels warning dialog', async ({ authenticatedPage: page }) => {
            await mockArticleSave(page);
            const editPage = await setupEditPage(page, 'Чистый текст');
            await editPage.typeInEditor('== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await editPage.clickSave();

            const cancelButton = page.getByTestId('confirmation-dialog-cancel');
            await cancelButton.click();

            await expect(page).toHaveURL(/\/edit/);
        });

        test('shows confirmation for bracket warnings on save', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, 'текст (без закрытия');
            // Type a space at the end to make content differ from version
            const cmContent = editPage.editorContainer.locator('.cm-content');
            await cmContent.click();
            await page.keyboard.press('End');
            await page.keyboard.type(' ');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await editPage.clickSave();

            const dialogTitle = getConfirmationDialogTitle(page);
            await expect(dialogTitle).toBeVisible();
            await expect(dialogTitle).toContainText('Предупреждения в тексте');
        });
    });

    test.describe('Lint gutter', () => {
        test('shows lint marker in gutter for invalid content', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== ((ссылка)) ==');

            const lintMarker = editPage.editorContainer.locator('.cm-lint-marker-warning');
            await expect(lintMarker.first()).toBeVisible();
        });

        test('does not show lint markers for valid content', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== Чистый заголовок ==');

            const lintMarkers = editPage.editorContainer.locator('.cm-lint-marker-warning, .cm-lint-marker-error');
            await expect(lintMarkers).toHaveCount(0);
        });
    });

    test.describe('Lint panel', () => {
        test('opens lint panel on indicator click', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await indicator.click();

            const lintPanel = editPage.editorContainer.locator('.cm-panel-lint');
            await expect(lintPanel).toBeVisible();
        });

        test('displays problem list in lint panel', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== ((ссылка)) *bold* ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await indicator.click();

            const lintPanel = editPage.editorContainer.locator('.cm-panel-lint');
            await expect(lintPanel).toBeVisible();
            await expect(lintPanel).toContainText('Ссылки запрещены в заголовках');
            await expect(lintPanel).toContainText('Жирный текст запрещён в заголовках');
        });

        test('closes lint panel on second indicator click', async ({ authenticatedPage: page }) => {
            const editPage = await setupEditPage(page, '== ((ссылка)) ==');
            const indicator = page.getByTestId('validation-indicator');
            await expect(indicator).not.toHaveClass(/validation-indicator--ok/);

            await indicator.click();
            const lintPanel = editPage.editorContainer.locator('.cm-panel-lint');
            await expect(lintPanel).toBeVisible();

            await indicator.click();
            await expect(lintPanel).not.toBeVisible();
        });
    });
});
