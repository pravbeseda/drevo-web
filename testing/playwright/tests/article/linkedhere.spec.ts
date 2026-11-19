import {
    test,
    expect,
    holdLinkedHerePage,
    mockArticleShow,
    mockLinkedHereApi,
    waitForLinkedHerePage,
} from '../../fixtures';
import {
    createLinkedHereItemDto,
    createLinkedHereItemDtoList,
    createLinkedHereResponse,
} from '../../mocks/linked-here';
import { mockArticleViewData } from '../../mocks/articles';
import { ArticlePage } from '../../pages/article.page';
import { LinkedHereTabPage } from '../../pages/linkedhere-tab.page';

const ARTICLE_ID = 42;
const ARTICLE = mockArticleViewData.single;

test.describe('LinkedHere tab', () => {
    let article: ArticlePage;
    let linkedhere: LinkedHereTabPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);
        article = new ArticlePage(page);
        linkedhere = new LinkedHereTabPage(page);
    });

    test('renders count and item list when API returns results', async ({ authenticatedPage: page }) => {
        const items = createLinkedHereItemDtoList(3);
        await mockLinkedHereApi(page, createLinkedHereResponse(items, { total: 3 }));

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();

        await expect(linkedhere.count).toHaveText(/Найдено статей: 3/);
        await expect(linkedhere.items).toHaveCount(3);
    });

    test('shows empty state when no articles link here', async ({ authenticatedPage: page }) => {
        await mockLinkedHereApi(page, createLinkedHereResponse([]));

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();

        await expect(linkedhere.empty).toBeVisible();
    });

    test('shows "no results" state when filter matches nothing', async ({ authenticatedPage: page }) => {
        const items = createLinkedHereItemDtoList(3);
        await mockLinkedHereApi(page, query =>
            query === '' ? createLinkedHereResponse(items, { total: 3 }) : createLinkedHereResponse([]),
        );

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();

        await linkedhere.filter('zzz');

        await expect(linkedhere.noResults).toBeVisible();
    });

    test('renders highlightedTitle as HTML when present', async ({ authenticatedPage: page }) => {
        const items = [
            createLinkedHereItemDto({
                id: 7,
                title: 'Drevo Article',
                highlightedTitle: '<mark>Drevo</mark> Article',
            }),
        ];
        await mockLinkedHereApi(page, query =>
            query === '' ? createLinkedHereResponse([]) : createLinkedHereResponse(items, { total: 1 }),
        );

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();

        await linkedhere.filter('Drevo');

        await expect(linkedhere.items).toHaveCount(1);
        await expect(linkedhere.highlights).toHaveText('Drevo');
    });

    test('asks for the next page of a filter whose first page replaces a list of the same length', async ({
        authenticatedPage: page,
    }) => {
        const PAGE_SIZE = 25;
        const TOTAL = 40;
        await mockLinkedHereApi(page, (query, pageNumber) =>
            createLinkedHereResponse(
                createLinkedHereItemDtoList(
                    pageNumber === 1 ? PAGE_SIZE : TOTAL - PAGE_SIZE,
                    (query ? 100 : 0) + (pageNumber - 1) * PAGE_SIZE + 1,
                ),
                { total: TOTAL, page: pageNumber },
            ),
        );
        // The unfiltered page 2 stays loading, so the filter drops it while the reader sits at the end.
        await holdLinkedHerePage(page, '', 2);
        const unfilteredPage2 = waitForLinkedHerePage(page, '', 2);

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();
        await linkedhere.scrollToEnd();
        await unfilteredPage2;

        const filteredPage2 = waitForLinkedHerePage(page, 'x', 2);
        await linkedhere.filter('x');

        await expect(filteredPage2).resolves.toBeTruthy();
    });

    test('clicking an item navigates to the corresponding article', async ({ authenticatedPage: page }) => {
        const items = createLinkedHereItemDtoList(1, 99);
        await mockLinkedHereApi(page, createLinkedHereResponse(items, { total: 1 }));
        await mockArticleShow(page, 99, { ...ARTICLE, articleId: 99, title: 'Linker' });

        await page.goto(`/articles/${ARTICLE_ID}/linkedhere`);
        await article.waitForReady();
        await linkedhere.waitForReady();

        await linkedhere.items.first().click();

        await expect(page).toHaveURL(/\/articles\/99(\b|$)/);
    });
});
