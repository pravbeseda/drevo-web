import {
    test,
    expect,
    bypassSsr,
    mockArticleCreate,
    mockArticleCreateDuplicate,
    mockArticleFindCreatableThenDenied,
    mockArticleFindCreatableThenError,
    mockArticleFindFound,
    mockArticleFindMissing,
    mockArticleShow,
    mockInworkCheck,
    mockInworkClear,
    mockInworkMark,
    mockLinkedHereApi,
} from '../../fixtures';
import { getNotification } from '../../helpers/notification';
import { createCreateArticleResponseDto } from '../../mocks/articles';
import { createLinkedHereResponse } from '../../mocks/linked-here';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { ArticleFindPage } from '../../pages/article-find.page';
import { ArticlePage } from '../../pages/article.page';
import { LinkedHereTabPage } from '../../pages/linkedhere-tab.page';

const NEW_TITLE = 'НОВАЯ СТАТЬЯ';
const FIND_URL = '/articles/find/НОВАЯ СТАТЬЯ';
const EXISTING_TITLE = 'ВИФСАИДА ГАЛИЛЕЙСКАЯ';
const EXISTING_URL = '/articles/find/ВИФСАИДА ГАЛИЛЕЙСКАЯ';
const EXISTING_ID = 42;
const CREATED_ID = 77;

/** Router percent-encodes cyrillic segments — compare against the readable form. */
function pathnameOf(url: string): string {
    return decodeURIComponent(new URL(url).pathname);
}

/**
 * Encode a title into a `/articles/find/:title` segment the way the backend
 * (rawurlencode) and Angular's own serializer do: space -> %20, '+' -> %2B, and
 * crucially '(' -> %28 / ')' -> %29, since '(' starts an auxiliary-outlet group
 * in Angular's URL syntax and would otherwise truncate the segment.
 */
function toFindSegment(title: string): string {
    return encodeURIComponent(title).replace(/\(/g, '%28').replace(/\)/g, '%29');
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

    test('preserves a literal plus in the title', async ({ authenticatedPage: page }) => {
        // Backend emits rawurlencode (space -> %20, '+' -> %2B), so the death
        // marker in "… (+ 1919)" survives the round-trip through the router.
        const titleWithPlus = 'РОЖДЕСТВЕНСКИЙ НИКОЛАЙ ИВАНОВИЧ (+ 1919)';
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, titleWithPlus);

        const findPage = new ArticleFindPage(page);
        await page.goto(`/articles/find/${toFindSegment(titleWithPlus)}`);
        await findPage.waitForReady();

        await expect(findPage.root).toContainText(`Статьи «${titleWithPlus}» пока не существует`);
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

    test('hides the create button when the re-check denies creation', async ({ authenticatedPage: page }) => {
        // canCreate flips to false between the placeholder load and the edit
        // re-check (e.g. edit limit reached). The denied redirect is a same-URL
        // navigation, so the placeholder state must still refresh — the button
        // must not keep looping the redirect.
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindCreatableThenDenied(page, NEW_TITLE, 'Лимит правок исчерпан');

        const findPage = new ArticleFindPage(page);
        await page.goto(FIND_URL);
        await findPage.waitForReady();
        await expect(findPage.createButton).toBeVisible();

        await findPage.clickCreate();

        await expect(findPage.createButton).toHaveCount(0);
        await expect(findPage.deniedReason).toContainText('Лимит правок исчерпан');
        expect(pathnameOf(page.url())).toBe(FIND_URL);
    });

    test('shows a load error and hides the create button when the re-check fails', async ({
        authenticatedPage: page,
    }) => {
        // The edit re-check errors (5xx) after the placeholder loaded creatable.
        // The redirect back is same-URL, so the shared placeholder state must be
        // refreshed to a load error rather than left looping the stale button.
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindCreatableThenError(page, NEW_TITLE);

        const findPage = new ArticleFindPage(page);
        const articlePage = new ArticlePage(page);
        await page.goto(FIND_URL);
        await findPage.waitForReady();
        await expect(findPage.createButton).toBeVisible();

        await findPage.clickCreate();

        await expect(articlePage.error).toContainText('Ошибка загрузки статьи');
        await expect(findPage.createButton).toHaveCount(0);
        expect(pathnameOf(page.url())).toBe(FIND_URL);
    });

    test('creates the article from an empty editor', async ({ authenticatedPage: page }) => {
        // A title with parens and a literal '+' exercises the frontend's own
        // routerLink encoding on the "create" button: Angular must emit %28/%29
        // for the parens (auxiliary-outlet syntax) and %2B for the plus.
        const title = 'СВЯТОЙ НИКОЛАЙ (+ 1919)';
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, title);
        await mockInworkCheck(page);
        await mockInworkMark(page);
        await mockInworkClear(page);
        await mockArticleCreate(page, createCreateArticleResponseDto({ articleId: CREATED_ID, title }));
        await mockArticleShow(page, CREATED_ID);

        const findPage = new ArticleFindPage(page);
        const editPage = new ArticleEditPage(page);
        await page.goto(`/articles/find/${toFindSegment(title)}`);
        await findPage.waitForReady();

        await findPage.clickCreate();
        await editPage.waitForReady();
        await expect(editPage.editorContent).toHaveText('');

        await editPage.typeInEditor('Текст новой статьи');
        await editPage.clickSave();

        await page.waitForURL(`**/articles/${CREATED_ID}`);
        await new ArticlePage(page).waitForReady();
    });

    test('keeps the draft in the editor on a concurrent duplicate-title 409', async ({ authenticatedPage: page }) => {
        // Someone else creates this title while the user is typing. The 409 must
        // not navigate away or discard the draft — the authored text stays put so
        // the user can copy it out instead of losing it to a silent redirect.
        const draftText = 'Текст, который автор не хочет потерять';
        await bypassSsr(page, '**/articles/find/**');
        await mockArticleFindMissing(page, NEW_TITLE);
        await mockInworkCheck(page);
        await mockInworkMark(page);
        await mockInworkClear(page);
        await mockArticleCreateDuplicate(page, EXISTING_ID);

        const findPage = new ArticleFindPage(page);
        const editPage = new ArticleEditPage(page);
        await page.goto(FIND_URL);
        await findPage.waitForReady();

        await findPage.clickCreate();
        await editPage.waitForReady();
        await editPage.typeInEditor(draftText);
        await editPage.clickSave();

        await expect(getNotification(page, 'error')).toContainText('уже создана');
        await expect(editPage.root).toBeVisible();
        await expect(editPage.editorContent).toHaveText(draftText);
        expect(pathnameOf(page.url())).toBe(`${FIND_URL}/edit`);
    });
});
