import { test, expect, mockArticleShow, mockLinkedHereApi } from '../../fixtures';
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
        await expect(linkedhere.items.locator('mark')).toHaveText('Drevo');
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
