import {
    test,
    expect,
    mockPicturesApi,
    mockPicturesEmpty,
    mockPicturesError,
    mockPicturesSearch,
    mockPictureThumbs,
} from '../../fixtures';
import { apiSuccess } from '../../mocks/common';
import { createPictureDtoList, createPicturesListResponse } from '../../mocks/pictures';
import { PictureGalleryPage } from '../../pages/picture-gallery.page';

test.describe('Picture gallery', () => {
    let gallery: PictureGalleryPage;

    test.describe('Gallery display', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await mockPictureThumbs(page);
            await mockPicturesApi(page);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();
        });

        test('shows search bar', async () => {
            await expect(gallery.searchBar).toBeVisible();
        });

        test('shows picture cards after loading', async () => {
            await gallery.waitForGallery();
            const count = await gallery.cards.count();
            expect(count).toBeGreaterThan(0);
        });

        test('picture cards have thumbnail images', async () => {
            await gallery.waitForGallery();
            const firstCard = gallery.cards.first();
            await expect(firstCard).toBeVisible();
            await expect(firstCard.locator('img')).toBeVisible();
        });
    });

    test.describe('Search', () => {
        test('shows empty state when search has no results', async ({ authenticatedPage: page }) => {
            await mockPictureThumbs(page);
            await mockPicturesApi(page);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();
            await gallery.waitForGallery();

            // Switch to empty results for search
            const emptyResponse = createPicturesListResponse([]);
            await mockPicturesSearch(page, emptyResponse);

            await gallery.search('несуществующий запрос');

            await gallery.waitForEmpty();
            await expect(gallery.empty).toHaveText('Ничего не найдено');
        });

        test('shows results when search matches', async ({ authenticatedPage: page }) => {
            await mockPictureThumbs(page);
            await mockPicturesApi(page);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();
            await gallery.waitForGallery();

            // Switch to filtered results
            const filtered = createPicturesListResponse(createPictureDtoList(3));
            await mockPicturesSearch(page, filtered);

            await gallery.search('тест');

            await gallery.waitForGallery();
            const count = await gallery.cards.count();
            expect(count).toBeGreaterThan(0);
        });
    });

    test.describe('Empty state', () => {
        test('shows empty state when no pictures and search is active', async ({ authenticatedPage: page }) => {
            // The showNoResults computed requires searchQuery.length > 0
            // On initial load with empty query, neither gallery nor empty is shown
            await mockPictureThumbs(page);
            await mockPicturesEmpty(page);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();

            // Type a search query to trigger showNoResults
            await gallery.search('поиск');

            await gallery.waitForEmpty();
            await expect(gallery.empty).toBeVisible();
        });
    });

    test.describe('Error handling', () => {
        test('does not crash on server error — shows no results', async ({ authenticatedPage: page }) => {
            await mockPictureThumbs(page);
            await mockPicturesError(page);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();

            // After error, loading should stop and page should be visible
            await expect(gallery.loading).not.toBeVisible();
            await expect(gallery.root).toBeVisible();
            // Gallery should not appear (error fallback returns empty)
            await expect(gallery.gallery).not.toBeVisible();
        });
    });

    test.describe('Pagination', () => {
        test('loads more pictures when scrolling to the bottom', async ({ authenticatedPage: page }) => {
            const page1Items = createPictureDtoList(25, 1);
            const page1Response = createPicturesListResponse(page1Items, { total: 50, totalPages: 2 });

            const page2Items = createPictureDtoList(25, 26);
            const page2Response = createPicturesListResponse(page2Items, { total: 50, page: 2, totalPages: 2 });

            await mockPictureThumbs(page);

            // Route handler that returns page 1 or page 2 based on query param
            await page.route(/\/api\/pictures(\?.*)?$/, route => {
                const url = new URL(route.request().url());
                const pageParam = url.searchParams.get('page');
                const response = pageParam === '2' ? page2Response : page1Response;
                return route.fulfill({ json: apiSuccess(response) });
            });

            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();
            await gallery.waitForGallery();

            const initialCount = await gallery.cards.count();

            // Scroll the virtual scroller viewport to the bottom to trigger loadMore
            await page.locator('cdk-virtual-scroll-viewport').evaluate(el => {
                el.scrollTop = el.scrollHeight;
            });

            // Wait for more cards to appear
            await expect(async () => {
                const newCount = await gallery.cards.count();
                expect(newCount).toBeGreaterThan(initialCount);
            }).toPass({ timeout: 5000 });
        });
    });
});
