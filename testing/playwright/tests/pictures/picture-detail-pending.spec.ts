import {
    test,
    expect,
    bypassSsr,
    mockAuthApi,
    mockPictureApprovePending,
    mockPictureApprovePendingNotFound,
    mockPictureArticles,
    mockPictureCancelPending,
    mockPictureCancelPendingNotFound,
    mockPictureDetail,
    mockPicturePending,
    mockPictureRejectPending,
    mockPictureRejectPendingNotFound,
    mockPictureThumbs,
} from '../../fixtures';
import { getNotification } from '../../helpers/notification';
import { createPictureDto, createPicturePendingDto, mockUsers } from '../../mocks';
import { PictureDetailPage } from '../../pages/picture-detail.page';
import { Page } from '@playwright/test';
import { PicturePendingDto, PicturePendingType } from '@drevo-web/shared';

const PICTURE_ID = 42;
const PICTURE = createPictureDto({
    pic_id: PICTURE_ID,
    pic_title: 'Тестовая иллюстрация',
    pic_user: 'testuser',
    pic_width: 1024,
    pic_height: 768,
});
const PENDING_TYPES: readonly { type: PicturePendingType; label: string }[] = [
    { type: 'delete', label: 'удаление' },
    { type: 'edit_title', label: 'изменение описания' },
    { type: 'edit_both', label: 'изменение описания и файла' },
];

test.describe('Picture detail pending banners', () => {
    test('shows cancel button for own pending', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, [
            createPicturePendingDto({
                pp_id: 11,
                pp_pic_id: PICTURE_ID,
                pp_user: mockUsers.authenticated.name,
                pp_title: 'Мой pending',
            }),
        ]);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingBanners).toHaveCount(1);
        await expect(detail.pendingCancel).toHaveCount(1);
        await expect(detail.pendingAuthor).toHaveCount(0);
    });

    test('shows author name for foreign pending to regular user', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, [
            createPicturePendingDto({
                pp_id: 12,
                pp_pic_id: PICTURE_ID,
                pp_user: 'Другой пользователь',
                pp_title: 'Чужой pending',
            }),
        ]);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingAuthor).toHaveText('Другой пользователь');
        await expect(detail.pendingCancel).toHaveCount(0);
        await expect(detail.pendingApprove).toHaveCount(0);
    });

    test('shows moderator actions for foreign pending', async ({ page }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, [
            createPicturePendingDto({
                pp_id: 13,
                pp_pic_id: PICTURE_ID,
                pp_user: 'Другой пользователь',
                pp_type: 'edit_both',
                pp_title: 'Текст на модерации',
            }),
        ]);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingApprove).toHaveCount(1);
        await expect(detail.pendingReject).toHaveCount(1);
        await expect(detail.pendingAuthor).toHaveCount(1);
        await expect(detail.pendingNewTitle).toHaveText('Текст на модерации');
    });

    test('renders multiple pending banners from backend', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await mockPicturePending(page, PICTURE_ID, [
            createPicturePendingDto({
                pp_id: 14,
                pp_pic_id: PICTURE_ID,
                pp_user: mockUsers.authenticated.name,
                pp_title: 'Первый pending',
            }),
            createPicturePendingDto({
                pp_id: 15,
                pp_pic_id: PICTURE_ID,
                pp_user: 'Другой пользователь',
                pp_type: 'edit_both',
                pp_title: 'Второй pending',
                pp_width: 1200,
                pp_height: 900,
            }),
        ]);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingBanners).toHaveCount(2);
        await expect(detail.pendingTexts.first()).toContainText('Изменение описания');
        await expect(detail.pendingTexts.nth(1)).toContainText('Изменение описания и файла');
    });

    test('removes own pending banner after cancel refresh', async ({ authenticatedPage: page }) => {
        const pendingItem = createPicturePendingDto({
            pp_id: 16,
            pp_pic_id: PICTURE_ID,
            pp_user: mockUsers.authenticated.name,
            pp_title: 'Нужно отменить',
        });
        let pendingRequestCount = 0;
        let resolveRefreshedPending: (() => void) | undefined;
        const refreshedPending = new Promise<void>(resolve => {
            resolveRefreshedPending = resolve;
        });

        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await page.route(`**/api/pictures/${PICTURE_ID}/pending`, route => {
            const method = route.request().method();
            if (method !== 'GET') return route.fallback();
            pendingRequestCount += 1;
            const items = pendingRequestCount === 1 ? [pendingItem] : [];
            if (pendingRequestCount === 2) {
                resolveRefreshedPending?.();
            }
            return route.fulfill({ json: { success: true, data: { items } } });
        });
        await mockPictureCancelPending(page, 16);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingBanners).toHaveCount(1);
        await Promise.all([
            refreshedPending,
            page.waitForResponse(`**/api/pictures/pending/16/cancel`),
            detail.pendingCancel.click(),
        ]);

        await expect(detail.pendingBanners).toHaveCount(0);
    });

    test('removes foreign pending banner after moderator approval refresh', async ({ page }) => {
        const pendingItem = createPicturePendingDto({
            pp_id: 17,
            pp_pic_id: PICTURE_ID,
            pp_user: 'Другой пользователь',
            pp_title: 'Ожидает одобрения',
        });
        let pendingRequestCount = 0;
        let resolveRefreshedPending: (() => void) | undefined;
        const refreshedPending = new Promise<void>(resolve => {
            resolveRefreshedPending = resolve;
        });

        await mockAuthApi(page, mockUsers.moderator);
        await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
        await mockPictureThumbs(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
        await mockPictureArticles(page, PICTURE_ID, []);
        await page.route(`**/api/pictures/${PICTURE_ID}/pending`, route => {
            const method = route.request().method();
            if (method !== 'GET') return route.fallback();
            pendingRequestCount += 1;
            const items = pendingRequestCount === 1 ? [pendingItem] : [];
            if (pendingRequestCount === 2) {
                resolveRefreshedPending?.();
            }
            return route.fulfill({ json: { success: true, data: { items } } });
        });
        await mockPictureApprovePending(page, 17);
        await mockPictureRejectPending(page, 17);

        const detail = new PictureDetailPage(page);
        await page.goto(`/pictures/${PICTURE_ID}`);
        await detail.waitForReady();

        await expect(detail.pendingBanners).toHaveCount(1);
        await Promise.all([
            refreshedPending,
            page.waitForResponse(`**/api/pictures/pending/17/approve`),
            detail.pendingApprove.click(),
        ]);

        await expect(detail.pendingBanners).toHaveCount(0);
    });
});

test.describe('Moderator pending action returns 404', () => {
    const MODERATOR_ACTIONS: readonly { action: 'approve' | 'reject'; label: string }[] = [
        { action: 'approve', label: 'принять' },
        { action: 'reject', label: 'отклонить' },
    ];

    for (const { type, label: typeLabel } of PENDING_TYPES) {
        for (const { action, label: actionLabel } of MODERATOR_ACTIONS) {
            test(`${typeLabel} — ${actionLabel}: shows info notification on 404`, async ({ page }) => {
                const PENDING_ID = 100;
                const pendingItem = createPendingByType(type, PENDING_ID, 'Другой пользователь');

                if (action === 'approve') {
                    await mockPictureApprovePendingNotFound(page, PENDING_ID);
                } else {
                    await mockPictureRejectPendingNotFound(page, PENDING_ID);
                }

                const detail = await setupPageWithDynamicPending(page, [pendingItem], [], {
                    asModerator: true,
                });
                await expect(detail.pendingBanners).toHaveCount(1);

                const actionButton = action === 'approve' ? detail.pendingApprove : detail.pendingReject;
                await actionButton.click();

                const infoNotification = getNotification(page, 'info');
                await expect(infoNotification).toContainText(
                    'Решение по этому предложению уже принято, либо пользователь отменил предложение',
                );
                await expect(getNotification(page, 'error')).toHaveCount(0);

                await expect(detail.pendingBanners).toHaveCount(0);
            });
        }
    }
});

test.describe('User cancel pending returns 404', () => {
    for (const { type, label: typeLabel } of PENDING_TYPES) {
        test(`${typeLabel}: shows info notification and removes banner on 404`, async ({ authenticatedPage: page }) => {
            const PENDING_ID_CANCEL = 200;
            const PENDING_ID_OTHER = 201;

            const cancelPending = createPendingByType(type, PENDING_ID_CANCEL, mockUsers.authenticated.name);
            const otherPending = createPicturePendingDto({
                pp_id: PENDING_ID_OTHER,
                pp_pic_id: PICTURE_ID,
                pp_user: 'Другой пользователь',
                pp_type: 'edit_title',
                pp_title: 'Чужой pending',
            });

            await mockPictureCancelPendingNotFound(page, PENDING_ID_CANCEL);

            const detail = await setupPageWithDynamicPending(page, [cancelPending, otherPending], [otherPending]);
            await expect(detail.pendingBanners).toHaveCount(2);

            await detail.pendingCancel.click();

            const infoNotification = getNotification(page, 'info');
            await expect(infoNotification).toContainText('Решение по этому предложению уже принято');
            await expect(getNotification(page, 'error')).toHaveCount(0);

            await expect(detail.pendingBanners).toHaveCount(1);
        });
    }
});

async function setupPageWithDynamicPending(
    page: Page,
    initialPending: readonly PicturePendingDto[],
    refreshedPending: readonly PicturePendingDto[],
    options?: { asModerator?: boolean },
): Promise<PictureDetailPage> {
    if (options?.asModerator) {
        await mockAuthApi(page, mockUsers.moderator);
    }
    await bypassSsr(page, `**/pictures/${PICTURE_ID}`);
    await mockPictureThumbs(page);
    await mockPictureDetail(page, PICTURE_ID, PICTURE);
    await mockPictureArticles(page, PICTURE_ID, []);

    let pendingRequestCount = 0;
    await page.route(`**/api/pictures/${PICTURE_ID}/pending`, route => {
        const method = route.request().method();
        if (method !== 'GET') return route.fallback();
        pendingRequestCount += 1;
        const items = pendingRequestCount === 1 ? initialPending : refreshedPending;
        return route.fulfill({ json: { success: true, data: { items } } });
    });

    const detail = new PictureDetailPage(page);
    await page.goto(`/pictures/${PICTURE_ID}`);
    await detail.waitForReady();
    return detail;
}

function createPendingByType(type: PicturePendingType, ppId: number, user: string): PicturePendingDto {
    return createPicturePendingDto({
        pp_id: ppId,
        pp_pic_id: PICTURE_ID,
        pp_user: user,
        pp_type: type,
        pp_title: type === 'delete' ? null : 'Новый заголовок',
        pp_width: type === 'edit_both' ? 1200 : null,
        pp_height: type === 'edit_both' ? 900 : null,
    });
}
