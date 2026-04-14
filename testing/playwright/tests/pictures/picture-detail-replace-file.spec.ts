import {
    test,
    expect,
    mockPictureDetail,
    mockPictureArticles,
    mockPictureReplaceFile,
    mockPictureReplaceFilePending,
    mockPictureReplaceFileError,
    mockPictureThumbs,
    bypassSsr,
} from '../../fixtures';
import { createPictureDto } from '../../mocks/pictures';
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

/** Minimal buffer — mimeType determines file.type, not magic bytes */
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

/** Helper: select a file via the hidden input (bypasses native file dialog) */
async function selectFile(
    detail: PictureDetailPage,
    options: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
    await detail.fileInput.setInputFiles(options);
}

test.describe('Picture detail — file replacement', () => {
    let detail: PictureDetailPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();
    });

    test('shows replace file action button', async () => {
        await detail.openMobileMenu();
        await expect(detail.replaceFileAction).toBeVisible();
    });

    test.describe('Validation', () => {
        test('shows error for non-JPEG file', async ({ authenticatedPage: page }) => {
            await selectFile(detail, {
                name: 'photo.png',
                mimeType: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
            });

            const notification = getNotification(page, 'error');
            await expect(notification).toContainText('Допустимый формат — только JPEG');
        });

        test('shows error for file exceeding 500KB', async ({ authenticatedPage: page }) => {
            const largeBuffer = Buffer.alloc(501 * 1024, 0);

            await selectFile(detail, {
                name: 'large.jpg',
                mimeType: 'image/jpeg',
                buffer: largeBuffer,
            });

            const notification = getNotification(page, 'error');
            await expect(notification).toContainText('Максимальный размер файла — 500 КБ');
        });

        test('does not open dialog for invalid file', async () => {
            await selectFile(detail, {
                name: 'photo.png',
                mimeType: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
            });

            await expect(detail.replaceDialogTitle).not.toBeVisible();
        });
    });

    test.describe('Dialog', () => {
        test('opens dialog with preview and pre-filled title', async () => {
            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await expect(detail.replaceDialogTitle).toBeVisible();
            await expect(detail.replaceDialogPreview).toBeVisible();
            await expect(detail.replaceDialogTitleInput).toHaveValue('Тестовая иллюстрация');
        });

        test('closes dialog on cancel without uploading', async ({ authenticatedPage: page }) => {
            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await detail.replaceDialogCancel.click();

            await expect(detail.replaceDialogTitle).not.toBeVisible();
            const notification = getNotification(page);
            await expect(notification).not.toBeVisible();
        });
    });

    test.describe('Upload', () => {
        test('successful upload by moderator shows success notification', async ({ authenticatedPage: page }) => {
            const updatedPicture = createPictureDto({
                pic_id: PICTURE_ID,
                pic_title: 'Новое описание',
                pic_user: 'testuser',
            });
            await mockPictureReplaceFile(page, PICTURE_ID, updatedPicture);

            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await detail.replaceDialogTitleInput.clear();
            await detail.replaceDialogTitleInput.fill('Новое описание');
            await detail.replaceDialogConfirm.click();

            const notification = getNotification(page, 'success');
            await expect(notification).toContainText('Файл заменён');
        });

        test('pending upload shows info notification', async ({ authenticatedPage: page }) => {
            await mockPictureReplaceFilePending(page, PICTURE_ID);

            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await detail.replaceDialogConfirm.click();

            const notification = getNotification(page, 'info');
            await expect(notification).toContainText('Изменение отправлено на модерацию');
        });

        test('upload error shows error notification', async ({ authenticatedPage: page }) => {
            await mockPictureReplaceFileError(page, PICTURE_ID);

            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await detail.replaceDialogConfirm.click();

            const notification = getNotification(page, 'error').filter({
                hasText: 'Не удалось заменить файл',
            });
            await expect(notification).toBeVisible();
        });

        test('sends file and pic_title in FormData', async ({ authenticatedPage: page }) => {
            let capturedFormFields: Record<string, string> = {};

            await page.route(`**/api/pictures/${PICTURE_ID}/file`, async route => {
                if (route.request().method() !== 'POST') return route.fallback();

                const postData = route.request().postData();
                if (postData) {
                    const titleMatch = postData.match(/name="pic_title"\r?\n\r?\n([^\r\n-]+)/);
                    if (titleMatch) capturedFormFields['pic_title'] = titleMatch[1];
                    if (postData.includes('name="file"')) capturedFormFields['file'] = 'present';
                }

                const updatedPicture = createPictureDto({
                    pic_id: PICTURE_ID,
                    pic_title: 'Новое описание',
                });
                return route.fulfill({ json: { success: true, data: updatedPicture } });
            });

            await selectFile(detail, {
                name: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                buffer: JPEG_BUFFER,
            });

            await detail.replaceDialogTitleInput.clear();
            await detail.replaceDialogTitleInput.fill('Новое описание');
            await detail.replaceDialogConfirm.click();

            const notification = getNotification(page, 'success');
            await expect(notification).toContainText('Файл заменён');

            expect(capturedFormFields['pic_title']).toBe('Новое описание');
            expect(capturedFormFields['file']).toBe('present');
        });
    });
});
