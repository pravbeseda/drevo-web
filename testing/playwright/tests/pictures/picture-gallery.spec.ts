import {
    test,
    expect,
    mockPicturesApi,
    mockPicturesEmpty,
    mockPicturesError,
    mockPicturesSearch,
    mockPictureThumbs,
} from '../../fixtures';
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
            await expect(gallery.root).toBeVisible();
            // Gallery should not appear (error fallback returns empty)
            await expect(gallery.gallery).not.toBeVisible();
        });
    });

    test.describe('Pagination', () => {
        test('loads initial page of pictures', async ({ authenticatedPage: page }) => {
            const items = createPictureDtoList(25);
            const response = createPicturesListResponse(items, { total: 50, totalPages: 2 });
            await mockPictureThumbs(page);
            await mockPicturesApi(page, response);
            gallery = new PictureGalleryPage(page);
            await page.goto('/pictures');
            await gallery.waitForReady();
            await gallery.waitForGallery();

            const count = await gallery.cards.count();
            expect(count).toBeGreaterThan(0);
        });
    });
});
