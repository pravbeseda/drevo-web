import {
    test,
    expect,
    bypassSsr,
    mockArticleCreate,
    mockArticleFindFound,
    mockArticleFindMissing,
    mockArticleShow,
    mockInworkCheck,
    mockInworkClear,
    mockInworkMark,
    mockLinkedHereApi,
} from '../../fixtures';
import { createCreateArticleResponseDto } from '../../mocks/articles';
import { createLinkedHereResponse } from '../../mocks/linked-here';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { ArticleFindPage } from '../../pages/article-find.page';
import { ArticlePage } from '../../pages/article.page';
import { LinkedHereTabPage } from '../../pages/linkedhere-tab.page';

const NEW_TITLE = 'НОВАЯ СТАТЬЯ';
const FIND_URL = '/articles/find/НОВАЯ+СТАТЬЯ';
const EXISTING_TITLE = 'ВИФСАИДА ГАЛИЛЕЙСКАЯ';
const EXISTING_URL = '/articles/find/ВИФСАИДА+ГАЛИЛЕЙСКАЯ';
const EXISTING_ID = 42;
const CREATED_ID = 77;

/** Router percent-encodes cyrillic segments — compare against the readable form. */
function pathnameOf(url: string): string {
    return decodeURIComponent(new URL(url).pathname);
}

test.describe('Article find by title', () => {
    test('redirects to the article when it exists', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindFound(page, EXISTING_TITLE, EXISTING_ID);
        await mockArticleShow(page, EXISTING_ID);

        await page.goto(EXISTING_URL);
        await new ArticlePage(page).waitForReady();

        expect(pathnameOf(page.url())).toBe(`/articles/${EXISTING_ID}`);
    });

    test.describe('placeholder page', () => {
        let findPage: ArticleFindPage;

        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, '**/articles/find/**');
            await mockArticleFindMissing(page, NEW_TITLE);
            await mockLinkedHereApi(page);
            findPage = new ArticleFindPage(page);
            await page.goto(FIND_URL);
            await findPage.waitForReady();
        });

        test('shows the missing article message and the create action', async () => {
            await expect(findPage.root).toContainText(`Статьи «${NEW_TITLE}» пока не существует`);
            await expect(findPage.createButton).toBeVisible();
        });

        test('hides the versions tab', async () => {
            await expect(findPage.tabHistory).toHaveCount(0);
            await expect(findPage.tabArticle).toBeVisible();
        });

        test('opens the linked-here tab', async ({ authenticatedPage: page }) => {
            await findPage.openLinkedHere();

            await expect.poll(() => pathnameOf(page.url())).toBe(`${FIND_URL}/linkedhere`);
        });
    });

    test('lists articles linking to the missing title', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, NEW_TITLE);
        await mockLinkedHereApi(
            page,
            createLinkedHereResponse([
                { id: 11, title: 'ПЕРВАЯ ССЫЛАЮЩАЯСЯ' },
                { id: 12, title: 'ВТОРАЯ ССЫЛАЮЩАЯСЯ' },
            ]),
        );

        const linkedHere = new LinkedHereTabPage(page);
        await page.goto(`${FIND_URL}/linkedhere`);
        await linkedHere.waitForReady();

        await expect(linkedHere.items).toHaveCount(2);
        await expect(linkedHere.empty).toHaveCount(0);
    });

    test('hides the create action when creation is denied', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, NEW_TITLE, {
            canCreate: false,
            reason: 'Недостаточно прав для создания статей',
        });

        const findPage = new ArticleFindPage(page);
        await page.goto(FIND_URL);
        await findPage.waitForReady();

        await expect(findPage.createButton).toHaveCount(0);
        await expect(findPage.deniedReason).toContainText('Недостаточно прав для создания статей');
    });

    test('creates the article from an empty editor', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, NEW_TITLE);
        await mockInworkCheck(page);
        await mockInworkMark(page);
        await mockInworkClear(page);
        await mockArticleCreate(page, createCreateArticleResponseDto({ articleId: CREATED_ID, title: NEW_TITLE }));
        await mockArticleShow(page, CREATED_ID);

        const findPage = new ArticleFindPage(page);
        const editPage = new ArticleEditPage(page);
        await page.goto(FIND_URL);
        await findPage.waitForReady();

        await findPage.clickCreate();
        await editPage.waitForReady();
        await expect(editPage.editorContainer).toContainText('');

        await editPage.typeInEditor('Текст новой статьи');
        await editPage.clickSave();

        await page.waitForURL(`**/articles/${CREATED_ID}`);
        await new ArticlePage(page).waitForReady();
    });
});
