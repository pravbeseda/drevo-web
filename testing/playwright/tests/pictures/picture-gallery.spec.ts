import {
    test,
    expect,
    mockPicturesApi,
    mockPicturesEmpty,
    mockPicturesError,
    mockPicturesSearch,
    mockPictureThumbs,
} from '../../fixtures';
import { apiSuccess, createPictureDtoList, createPicturesListResponse } from '../../mocks';
import { PictureGalleryPage } from '../../pages/picture-gallery.page';
import { Page } from '@playwright/test';
import { type PictureDto } from '@drevo-web/shared';

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

    test.describe('Layout', () => {
        test('keeps illustration rows within viewport width at 1350x760', async ({ authenticatedPage: page }) => {
            await page.setViewportSize({ width: 1350, height: 760 });
            await mockPictureThumbs(page);
            await mockPicturesApi(page, createPicturesListResponse(illustrationRowWidthItems));
            gallery = new PictureGalleryPage(page);
            await page.addInitScript(() => {
                localStorage.setItem('drevo-sidebar-open', 'false');
            });
            await page.goto('/pictures');
            await gallery.waitForReady();
            await gallery.waitForGallery();

            const viewport = page.locator('cdk-virtual-scroll-viewport');
            const rows = gallery.gallery.locator('.picture-row');

            await expect(async () => {
                const viewportWidth = await viewport.evaluate(el => (el as HTMLElement).clientWidth);
                const rowWidths = await rows.evaluateAll(rowElements =>
                    rowElements.map(rowElement => {
                        const row = rowElement as HTMLElement;
                        const style = getComputedStyle(row);
                        const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
                        const cards = Array.from(row.querySelectorAll<HTMLElement>('[data-testid="picture-card"]'));

                        return (
                            cards.reduce((sum, card) => sum + card.getBoundingClientRect().width, 0) +
                            Math.max(cards.length - 1, 0) * gap
                        );
                    }),
                );

                expect(rowWidths.length).toBeGreaterThan(0);
                for (const rowWidth of rowWidths) {
                    expect(rowWidth).toBeLessThanOrEqual(viewportWidth + 1);
                }
                // All non-last rows must have equal total width (justified layout).
                // Math.round() per card can cause ±0.5px per card — allow 4px tolerance.
                const fullRowWidths = rowWidths.slice(0, -1);
                if (fullRowWidths.length > 1) {
                    const referenceWidth = fullRowWidths[0];
                    for (const rowWidth of fullRowWidths.slice(1)) {
                        expect(Math.abs(rowWidth - referenceWidth)).toBeLessThanOrEqual(4);
                    }
                }
            }).toPass({ timeout: 5000 });
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
            // 50 pictures on page 1 (~13 rows at standard viewport) ensures a scrollbar appears
            // and auto-load does not fire before the user scrolls
            gallery = await setupPaginatedGallery(page, { firstPageSize: 50 });

            const initialCount = await gallery.cards.count();

            await page.locator('cdk-virtual-scroll-viewport').evaluate(el => {
                el.scrollTop = el.scrollHeight;
            });

            await expect(async () => {
                const count = await gallery.cards.count();
                expect(count).toBeGreaterThan(initialCount);
            }).toPass({ timeout: 5000 });
        });

        test('auto-loads more pictures on wide viewport when all fit without scrolling', async ({
            authenticatedPage: page,
        }) => {
            // Wide viewport: 2300x1100 — all 25 pictures fit, no scrollbar appears
            await page.setViewportSize({ width: 2300, height: 1100 });

            gallery = await setupPaginatedGallery(page);

            // On a wide screen, all 25 items fit without scroll.
            // The component should detect this and auto-load the next page.
            await expect(async () => {
                const totalCount = await gallery.cards.count();
                expect(totalCount).toBeGreaterThan(25);
            }).toPass({ timeout: 5000 });
        });
    });
});

async function setupPaginatedGallery(
    page: Page,
    options: { firstPageSize?: number } = {},
): Promise<PictureGalleryPage> {
    const firstPageSize = options.firstPageSize ?? 25;
    const page2Count = 25;
    const total = firstPageSize + page2Count;

    const page1Items = createPictureDtoList(firstPageSize, 1);
    const page1Response = createPicturesListResponse(page1Items, { total, pageSize: firstPageSize });

    const page2Items = createPictureDtoList(page2Count, firstPageSize + 1);
    const page2Response = createPicturesListResponse(page2Items, { total, page: 2, totalPages: 2 });

    await mockPictureThumbs(page);

    await page.route(/\/api\/pictures(\?.*)?$/, route => {
        const url = new URL(route.request().url());
        const pageParam = url.searchParams.get('page');
        const response = pageParam === '2' ? page2Response : page1Response;
        return route.fulfill({ json: apiSuccess(response) });
    });

    const galleryPage = new PictureGalleryPage(page);
    await page.goto('/pictures');
    await galleryPage.waitForReady();
    await galleryPage.waitForGallery();
    return galleryPage;
}

const illustrationRowWidthItems: readonly PictureDto[] = [
    {
        pic_id: 21759,
        pic_folder: '004',
        pic_title: 'Икона "Пресвятая Богородица даде икону к церкви Печерской"',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 656,
        pic_height: 794,
    },
    {
        pic_id: 21758,
        pic_folder: '004',
        pic_title: 'Собор Арсинойских святых. Икона (Кипр, ок. 2024)',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 722,
        pic_height: 1200,
    },
    {
        pic_id: 21757,
        pic_folder: '004',
        pic_title:
            '"Вручение во Влахернах иконы Успения Пресвятой Богородицы 12 братьями строителями великой церкви Киево-Печерской лавры". Литография, 1904 год',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 687,
        pic_height: 633,
    },
    {
        pic_id: 21756,
        pic_folder: '004',
        pic_title: '"Богоматерь Влахернская" (Деденёвский список). 1870-е гг.',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 556,
        pic_height: 662,
    },
    {
        pic_id: 21755,
        pic_folder: '004',
        pic_title:
            'Прор. Михей Морасфитянин. Икона (1-я четверть XVIII в.) из пророческого ряда церкви Преображения, Кижи',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 767,
        pic_height: 1000,
    },
    {
        pic_id: 21754,
        pic_folder: '004',
        pic_title: '(TMP_для форума).',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 595,
        pic_height: 483,
    },
    {
        pic_id: 21753,
        pic_folder: '004',
        pic_title: 'Триодь, 2-я Нд Великого поста',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 1220,
        pic_height: 280,
    },
    {
        pic_id: 21752,
        pic_folder: '004',
        pic_title: 'Минея, 14.11',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 1219,
        pic_height: 204,
    },
    {
        pic_id: 21751,
        pic_folder: '004',
        pic_title: 'Служебник, изд. МП, 14.11',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 381,
        pic_height: 425,
    },
    {
        pic_id: 21750,
        pic_folder: '004',
        pic_title: 'Официальный календарь РПЦ, 2-я Нд Великого поста\r\nhttp://calendar.rop.ru/?idd=75',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 1066,
        pic_height: 108,
    },
    {
        pic_id: 21749,
        pic_folder: '004',
        pic_title: 'оф. календарь РПЦ 14.11\r\nhttp://calendar.rop.ru/?idd=331',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 1067,
        pic_height: 152,
    },
    {
        pic_id: 21748,
        pic_folder: '004',
        pic_title: 'Список имён святых в официальном календаре РПЦ\r\nhttp://calendar.rop.ru/sv2026.php?bukva=04',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 583,
        pic_height: 261,
    },
    {
        pic_id: 21747,
        pic_folder: '004',
        pic_title: '(TMP_для форума)',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 691,
        pic_height: 1484,
    },
    {
        pic_id: 21746,
        pic_folder: '004',
        pic_title: 'Собор всех святых воинов. Украинская икона (2015 г.)',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 837,
        pic_height: 1100,
    },
    {
        pic_id: 21745,
        pic_folder: '004',
        pic_title: 'Икона Богородицы "Троеручица". Афон.',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 637,
        pic_height: 838,
    },
    {
        pic_id: 21744,
        pic_folder: '004',
        pic_title: 'Прошу удалить',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 657,
        pic_height: 850,
    },
    {
        pic_id: 21743,
        pic_folder: '004',
        pic_title: 'Икона Божией Матери "Троеручица". VIII век. Афон. Монастырь Хиландар',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 736,
        pic_height: 911,
    },
    {
        pic_id: 21742,
        pic_folder: '004',
        pic_title:
            'Свт. Николай Мирликийский. Изображение на оборотной стороне иконы Божией Матери "Троеручица". Мон-рь Хиландар, Афон. Ок. 1350 г.',
        pic_user: 'Николая',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 520,
        pic_height: 719,
    },
    {
        pic_id: 21741,
        pic_folder: '004',
        pic_title: 'Равноап. Нина Грузинская  с житием. Грузинская икона (нач. XXi в.)',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 823,
        pic_height: 1100,
    },
    {
        pic_id: 21740,
        pic_folder: '004',
        pic_title: 'Равноап. Нина Грузинская. Русская икона (нач. XXi в.)',
        pic_user: 'Донатас Таутер',
        pic_date: '2026-03-18 02:40:02',
        pic_width: 869,
        pic_height: 1100,
    },
];
