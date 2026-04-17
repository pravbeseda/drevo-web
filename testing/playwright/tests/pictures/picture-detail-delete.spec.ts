import {
    test,
    expect,
    mockPictureDetail,
    mockPictureArticles,
    mockPicturePending,
    mockPictureDelete,
    mockPictureDeletePending,
    mockPictureDeleteConflict,
    mockPictureThumbs,
    bypassSsr,
} from '../../fixtures';
import { createPictureArticleDto, createPictureDto } from '../../mocks/pictures';
import { getNotification } from '../../helpers/notification';
import { PictureDetailPage } from '../../pages/picture-detail.page';

const PICTURE_ID = 42;
const PICTURE = createPictureDto({
    pic_id: PICTURE_ID,
    pic_title: 'Тестовая иллюстрация',
    pic_user: 'testuser',
    pic_width: 1024,
    pic_height: 768,
});

test.describe('Picture detail — deletion', () => {
    let detail: PictureDetailPage;

    test.describe('with articles', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, PICTURE);
            await mockPictureArticles(page, PICTURE_ID, [
                createPictureArticleDto({ id: 10, title: 'Статья 1' }),
            ]);
            await mockPicturePending(page, PICTURE_ID);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();
        });

        test('delete button is disabled when articles exist', async () => {
            await detail.openMobileMenu();
            await expect(detail.deleteAction).toBeDisabled();
        });
    });

    test.describe('without articles', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
            await mockPictureThumbs(page);
            await mockPictureDetail(page, PICTURE_ID, PICTURE);
            await mockPictureArticles(page, PICTURE_ID, []);
            await mockPicturePending(page, PICTURE_ID);
            detail = new PictureDetailPage(page);
            await page.goto(`/pictures/${PICTURE_ID}`);
            await detail.waitForReady();
        });

        test('delete button is enabled when no articles', async () => {
            await detail.openMobileMenu();
            await expect(detail.deleteAction).toBeEnabled();
        });

        test('opens confirmation dialog on delete click', async () => {
            await detail.openMobileMenu();
            await detail.deleteAction.click();
            await expect(detail.confirmationTitle).toContainText('Удаление иллюстрации');
        });

        test('cancel confirmation does not delete', async ({ authenticatedPage: page }) => {
            await detail.openMobileMenu();
            await detail.deleteAction.click();
            await detail.confirmationCancel.click();

            await expect(detail.confirmationTitle).not.toBeVisible();
            const notification = getNotification(page);
            await expect(notification).not.toBeVisible();
        });

        test('successful delete redirects and shows success notification', async ({ authenticatedPage: page }) => {
            await mockPictureDelete(page, PICTURE_ID, PICTURE);

            await detail.openMobileMenu();
            await detail.deleteAction.click();
            await detail.confirmationConfirm.click();

            const notification = getNotification(page, 'success');
            await expect(notification).toContainText('Иллюстрация удалена');
            await expect(page).toHaveURL(/\/pictures$/);
        });

        test('pending delete shows info notification without redirect', async ({ authenticatedPage: page }) => {
            await mockPictureDeletePending(page, PICTURE_ID);

            await detail.openMobileMenu();
            await detail.deleteAction.click();
            await detail.confirmationConfirm.click();

            const notification = getNotification(page, 'info');
            await expect(notification).toContainText('Запрос на удаление отправлен на модерацию');
            await expect(page).toHaveURL(new RegExp(`/pictures/${PICTURE_ID}`));
        });

        test('409 conflict shows specific error message', async ({ authenticatedPage: page }) => {
            await mockPictureDeleteConflict(page, PICTURE_ID);

            await detail.openMobileMenu();
            await detail.deleteAction.click();
            await detail.confirmationConfirm.click();

            const notification = getNotification(page, 'error');
            await expect(notification).toContainText('Иллюстрация используется в статьях и не может быть удалена');
        });
    });
});
