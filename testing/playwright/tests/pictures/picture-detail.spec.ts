import {
    test,
    expect,
    mockPictureDetail,
    mockPictureNotFound,
    mockPictureDetailError,
    mockPictureArticles,
    mockPictureUpdateTitle,
    mockPictureUpdateTitlePending,
    mockPictureThumbs,
    bypassSsr,
} from '../../fixtures';
import { createPictureDto, createPictureArticleDto } from '../../mocks/pictures';
import { PictureDetailPage } from '../../pages/picture-detail.page';

const PICTURE_ID = 42;
const PICTURE = createPictureDto({
    pic_id: PICTURE_ID,
    pic_title: 'Тестовая иллюстрация',
    pic_user: 'testuser',
    pic_width: 1024,
    pic_height: 768,
});

test.describe('Picture detail', () => {
    let detail: PictureDetailPage;

    test.describe('Display', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, PICTURE);
            await mockPictureArticles(page, PICTURE_ID, []);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();
        });

        test('shows picture image', async () => {
            await expect(detail.image).toBeVisible();
        });

        test('shows picture title', async () => {
            await expect(detail.title).toHaveText('Тестовая иллюстрация');
        });

        test('shows author', async () => {
            await expect(detail.author).toHaveText('testuser');
        });

        test('shows dimensions', async () => {
            await expect(detail.dimensions).toContainText('1024 × 768');
        });
    });

    test.describe('Articles section', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, PICTURE);
        });

        test('shows linked articles', async ({ authenticatedPage: page }) => {
            const articles = [
                createPictureArticleDto({ id: 10, title: 'Первая статья' }),
                createPictureArticleDto({ id: 20, title: 'Вторая статья' }),
            ];
            await mockPictureArticles(page, PICTURE_ID, articles);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();

            await expect(detail.articles).toBeVisible();
            await expect(detail.articleLinks).toHaveCount(2);
            await expect(detail.articleLinks.first()).toHaveText('Первая статья');
        });

        test('shows empty message when no articles', async ({ authenticatedPage: page }) => {
            await mockPictureArticles(page, PICTURE_ID, []);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();

            await expect(detail.articlesEmpty).toBeVisible();
            await expect(detail.articlesEmpty).toHaveText('Нет');
        });

        test('shows error when articles fail to load', async ({ authenticatedPage: page }) => {
            await page.route(`**/api/pictures/${PICTURE_ID}/articles`, route =>
                route.fulfill({ status: 500, json: { success: false, error: 'Server error' } }),
            );
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();

            await expect(detail.articlesError).toBeVisible();
            await expect(detail.articlesError).toHaveText('Не удалось загрузить');
        });
    });

    test.describe('Title editing', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, PICTURE);
            await mockPictureArticles(page, PICTURE_ID, []);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();
        });

        test('allows editing title and saves successfully (moderator)', async ({ authenticatedPage: page }) => {
            const updatedPicture = createPictureDto({
                pic_id: PICTURE_ID,
                pic_title: 'Обновлённое описание',
                pic_user: 'testuser',
            });
            await mockPictureUpdateTitle(page, PICTURE_ID, updatedPicture);

            await detail.editTitle('Обновлённое описание');

            await expect(detail.title).toHaveText('Обновлённое описание');
        });

        test('sends pending request for regular user', async ({ authenticatedPage: page }) => {
            await mockPictureUpdateTitlePending(page, PICTURE_ID);

            await detail.editTitle('Новое описание на модерацию');

            await expect(detail.title).toBeVisible();
            await expect(detail.titleEdit).not.toBeVisible();
        });
    });

    test.describe('Error states', () => {
        test('shows not-found error for non-existent picture', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, '**/pictures/999');
            await mockPictureThumbs(page);
            await mockPictureNotFound(page, 999);
            detail = new PictureDetailPage(page);
            await page.goto('/pictures/999');

            await expect(detail.notFoundError).toBeVisible();
        });

        test('shows load error for server failure', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetailError(page, PICTURE_ID);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);

            await expect(detail.loadError).toBeVisible();
        });

        test('shows not-found for invalid ID', async ({ authenticatedPage: page }) => {
            await bypassSsr(page, '**/pictures/abc');
            await mockPictureThumbs(page);
            detail = new PictureDetailPage(page);
            await page.goto('/pictures/abc');

            await expect(detail.notFoundError).toBeVisible();
        });
    });

    test.describe('Dimensions', () => {
        test('hides dimensions when picture has no size info', async ({ authenticatedPage: page }) => {
            const noDimPicture = createPictureDto({
                pic_id: PICTURE_ID,
                pic_title: 'Без размеров',
                pic_width: null,
                pic_height: null,
            });
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, noDimPicture);
            await mockPictureArticles(page, PICTURE_ID, []);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();

            await expect(detail.dimensions).not.toBeVisible();
        });
    });
});
