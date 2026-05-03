import {
    test,
    expect,
    mockArticlesApi,
    mockArticlesEmpty,
    mockArticleShow,
} from '../../fixtures';
import { mockArticleData, mockArticleViewData } from '../../mocks/articles';
import { LayoutPage } from '../../pages/layout.page';
import { SearchPage } from '../../pages/search.page';

test.describe('Search modal', () => {
    test('opens search modal on button click', async ({ authenticatedPage: page }) => {
        await mockArticlesApi(page);
        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForReady();

        await layout.openSearch();

        const search = new SearchPage(page);
        await expect(search.container).toBeVisible();
    });

    test('shows results after typing a query', async ({ authenticatedPage: page }) => {
        await mockArticlesApi(page);
        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForReady();
        await layout.openSearch();
        const search = new SearchPage(page);

        const responsePromise = page.waitForResponse(r =>
            r.url().includes('/api/articles/search') && r.url().includes('q='),
        );
        await search.typeQuery('дерево');
        await responsePromise;

        await expect(search.results).toBeVisible();
        expect(await search.resultItems.count()).toBeGreaterThan(0);
    });

    test('shows no-results message when query has no matches', async ({ authenticatedPage: page }) => {
        await mockArticlesApi(page);
        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForReady();
        await layout.openSearch();

        await mockArticlesEmpty(page);

        const search = new SearchPage(page);
        const responsePromise = page.waitForResponse(r =>
            r.url().includes('/api/articles/search') && r.url().includes('q='),
        );
        await search.typeQuery('несуществующий');
        await responsePromise;

        await expect(search.noResults).toBeVisible();
    });

    test('sends only one request for rapid typing (debounce)', async ({ authenticatedPage: page }) => {
        await mockArticlesApi(page);
        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForReady();

        // Wait for the initial empty search triggered on modal open
        const initialResponsePromise = page.waitForResponse('**/api/articles/search**');
        await layout.openSearch();
        await initialResponsePromise;

        const search = new SearchPage(page);

        let searchCount = 0;
        page.on('request', req => {
            if (req.url().includes('/api/articles/search') && req.url().includes('q=')) {
                searchCount++;
            }
        });

        // Type multiple characters rapidly (within the 500ms debounce window)
        const responsePromise = page.waitForResponse(r =>
            r.url().includes('/api/articles/search') && r.url().includes('q='),
        );
        await search.typeQuerySlowly('дер');
        await responsePromise;

        expect(searchCount).toBe(1);
    });

    test('navigates to article and closes modal on result click', async ({ authenticatedPage: page }) => {
        await mockArticlesApi(page);
        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForReady();
        await layout.openSearch();
        const search = new SearchPage(page);

        // Wait for initial results from empty query
        await page.waitForResponse('**/api/articles/search**');
        await expect(search.results).toBeVisible();

        // Mock the article page that will load after navigation
        const firstArticleId = mockArticleData.smallList[0].id;
        await mockArticleShow(page, firstArticleId, mockArticleViewData.single);

        await search.firstResult.click();

        await expect(page).toHaveURL(new RegExp(`/articles/${firstArticleId}`));
        await expect(search.container).not.toBeVisible();
    });
});
