import {
    test,
    expect,
    mockPictureDetail,
    mockPictureArticles,
    mockPicturePending,
    mockPictureThumbs,
    bypassSsr,
} from '../../fixtures';
import { createPictureDto } from '../../mocks';
import { LightboxPage } from '../../pages/lightbox.page';
import { PictureDetailPage } from '../../pages/picture-detail.page';

const PICTURE_ID = 42;
const PICTURE = createPictureDto({
    pic_id: PICTURE_ID,
    pic_title: 'Тестовая иллюстрация',
    pic_user: 'testuser',
    pic_width: 1024,
    pic_height: 768,
});

test.describe('Picture lightbox', () => {
    let detail: PictureDetailPage;
    let lightbox: LightboxPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID);
        detail = new PictureDetailPage(page);
        lightbox = new LightboxPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();
    });

    test('opens lightbox when clicking detail image', async () => {
        await detail.image.click();
        await lightbox.waitForReady();

        await expect(lightbox.backdrop).toBeVisible();
        await expect(lightbox.image).toBeVisible();
    });

    test('shows picture title as a link in lightbox footer', async () => {
        await detail.image.click();
        await lightbox.waitForReady();

        await expect(lightbox.titleLink).toBeVisible();
        await expect(lightbox.titleLink).toHaveText('Тестовая иллюстрация');
    });

    test('title link has tooltip', async ({ authenticatedPage: page, isMobile }) => {
        test.skip(isMobile, 'Hover tooltips are not available on mobile');

        await detail.image.click();
        await lightbox.waitForReady();

        await lightbox.titleLink.hover();
        const tooltip = page.locator('.mat-mdc-tooltip');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toHaveText('Открыть страницу иллюстрации');
    });

    test('title link navigates to picture detail page', async ({ authenticatedPage: page }) => {
        await detail.image.click();
        await lightbox.waitForReady();

        await lightbox.titleLink.click();

        await expect(page).toHaveURL(new RegExp(`/pictures/${PICTURE_ID}`));
        await expect(lightbox.backdrop).not.toBeVisible();
    });

    test('closes lightbox via close button', async () => {
        await detail.image.click();
        await lightbox.waitForReady();

        await lightbox.close.click();

        await expect(lightbox.backdrop).not.toBeVisible();
    });
});
