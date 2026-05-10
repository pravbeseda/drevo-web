import {
    test,
    expect,
    mockPicturesApi,
    mockPicturesEmpty,
    mockPicturesError,
    mockPicturesPendingList,
    mockPicturesPendingEmpty,
    mockPicturesPendingError,
    mockPictureThumbs,
    mockPictureDetail,
    mockPictureArticles,
    mockPicturePending,
} from '../../fixtures';
import { createPicturePendingDto, createPictureDto, createPicturesListResponse } from '../../mocks';
import { PicturesHistoryPage } from '../../pages/pictures-history.page';
import { assertIsDefined } from '@drevo-web/shared';

test.describe('Pictures history page', () => {
    test('shows recent items list', async ({ authenticatedPage: page }) => {
        const pictures = [
            createPictureDto({ pic_id: 1, pic_title: 'Первая' }),
            createPictureDto({ pic_id: 2, pic_title: 'Вторая' }),
        ];
        await mockPicturesPendingEmpty(page);
        await mockPicturesApi(page, createPicturesListResponse(pictures));
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.picturesList).toBeVisible();
        await expect(history.recentItems).toHaveCount(2);
        await expect(history.recentItemTitles.first()).toHaveText('Первая');
    });

    test('shows empty state when no data', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingEmpty(page);
        await mockPicturesEmpty(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.recentEmpty).toBeVisible();
    });

    test('shows error on recent API failure', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingEmpty(page);
        await mockPicturesError(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.recentError).toBeVisible();
    });

    test('shows pending cards when pending items exist', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: 10,
                pp_type: 'edit_title',
                pp_title: 'Новое описание',
                pp_user: 'editor',
                pic_title: 'Картинка А',
            }),
        ]);
        await mockPicturesEmpty(page);
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.pendingCards).toHaveCount(1);
        await expect(history.pendingCardTitles.first()).toHaveText('Картинка А');
    });

    test('shows pending type label and author', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: 10,
                pp_type: 'delete',
                pp_title: null,
                pp_user: 'moderator',
                pic_title: 'Удаляемая',
            }),
        ]);
        await mockPicturesEmpty(page);
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.pendingItemTypes.first()).toHaveText('Удаление иллюстрации');
        await expect(history.pendingItemAuthors.first()).toHaveText('moderator');
    });

    test('groups multiple pending for same picture into one card', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: 10,
                pp_type: 'edit_title',
                pp_user: 'user1',
                pic_title: 'Общая картинка',
            }),
            createPicturePendingDto({
                pp_id: 2,
                pp_pic_id: 10,
                pp_type: 'edit_file',
                pp_user: 'user2',
                pic_title: 'Общая картинка',
            }),
        ]);
        await mockPicturesEmpty(page);
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.pendingCards).toHaveCount(1);
        await expect(history.pendingItemTypes).toHaveCount(2);
    });

    test('shows pending cards above recent items', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: 10,
                pp_type: 'edit_title',
                pp_user: 'editor',
                pic_title: 'Pending картинка',
            }),
        ]);
        await mockPicturesApi(
            page,
            createPicturesListResponse([createPictureDto({ pic_id: 20, pic_title: 'Недавняя' })]),
        );
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.pendingCards).toHaveCount(1);
        await expect(history.recentItems).toHaveCount(1);

        const pendingBox = await history.pendingCards.first().boundingBox();
        const recentBox = await history.recentItems.first().boundingBox();
        assertIsDefined(pendingBox, 'Pending card bounding box is undefined');
        assertIsDefined(recentBox, 'Recent item bounding box is undefined');
        expect(pendingBox.y).toBeLessThan(recentBox.y);
    });

    test('shows only pending cards when recent is empty', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: 10,
                pp_type: 'edit_both',
                pp_user: 'editor',
                pic_title: 'Только pending',
            }),
        ]);
        await mockPicturesEmpty(page);
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.pendingCards).toHaveCount(1);
        await expect(history.recentItems).toHaveCount(0);
    });

    test('clicking pending card navigates to picture detail', async ({ authenticatedPage: page }) => {
        const PICTURE_ID = 42;
        await mockPicturesPendingList(page, [
            createPicturePendingDto({
                pp_id: 1,
                pp_pic_id: PICTURE_ID,
                pp_type: 'edit_title',
                pp_user: 'editor',
                pic_title: 'Navigable',
            }),
        ]);
        await mockPicturesEmpty(page);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, createPictureDto({ pic_id: PICTURE_ID }));
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, []);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await history.pendingCards.first().click();
        await page.waitForURL(`**/pictures/${PICTURE_ID}`);
    });

    test('shows inline pending error when pending fails but recent loads', async ({ authenticatedPage: page }) => {
        await mockPicturesPendingError(page);
        await mockPicturesApi(
            page,
            createPicturesListResponse([createPictureDto({ pic_id: 1, pic_title: 'Недавняя' })]),
        );
        await mockPictureThumbs(page);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await expect(history.picturesList).toBeVisible();
        await expect(history.recentItems).toHaveCount(1);
        await expect(history.pendingError).toBeVisible();
        await expect(history.pendingError).toHaveText('Не удалось загрузить ожидающие модерации');
    });

    test('clicking recent item navigates to picture detail', async ({ authenticatedPage: page }) => {
        const PICTURE_ID = 33;
        await mockPicturesPendingEmpty(page);
        await mockPicturesApi(
            page,
            createPicturesListResponse([createPictureDto({ pic_id: PICTURE_ID, pic_title: 'Click me' })]),
        );
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, createPictureDto({ pic_id: PICTURE_ID }));
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, []);

        await page.goto('/history/pictures');
        const history = new PicturesHistoryPage(page);
        await history.waitForReady();

        await history.recentItems.first().click();
        await page.waitForURL(`**/pictures/${PICTURE_ID}`);
    });
});
