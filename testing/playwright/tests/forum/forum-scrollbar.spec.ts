import { expect, mockForumSectionsApi, mockForumTopicsApi, test } from '../../fixtures';
import { createForumTopicListItemDto, createForumTopicListResponse } from '../../mocks/forum';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { Locator, Page } from '@playwright/test';

const TOPIC_COUNT = 40;
const THIN_HANDLE_PX = 4;
const WIDE_HANDLE_PX = 8;
/** How far above the track's bottom end the pointer goes — clear of the handle, which starts at the top. */
const TRACK_END_OFFSET_PX = 10;

async function openLongList(page: Page): Promise<ForumTopicsPage> {
    await mockForumSectionsApi(page);
    await mockForumTopicsApi(
        page,
        createForumTopicListResponse(
            Array.from({ length: TOPIC_COUNT }, (_, index) =>
                createForumTopicListItemDto({ id: index + 1, title: `Тема ${index + 1}` }),
            ),
        ),
    );
    const topics = new ForumTopicsPage(page);
    await page.goto('/forum');
    await topics.waitForReady();
    await topics.list.hover();
    return topics;
}

const width = async (locator: Locator): Promise<number | undefined> => (await locator.boundingBox())?.width;

/** The alpha channel of the element's computed background. */
const backgroundAlpha = (locator: Locator): Promise<number> =>
    locator.evaluate(element => {
        // `rgb(r, g, b)` for an opaque colour, `rgba(r, g, b, a)` otherwise — transparent included.
        const [, , , alpha = '1'] = getComputedStyle(element).backgroundColor.match(/[\d.]+/g) ?? [];
        return Number(alpha);
    });

test.describe('Forum topic list scrollbar', () => {
    test('draws a thin translucent handle over the list and widens it under the pointer', async ({
        authenticatedPage: page,
    }) => {
        const topics = await openLongList(page);

        // Drawn over the rows: the list keeps its whole width for them.
        expect(
            await topics.list.evaluate(
                (list: HTMLElement) =>
                    list.offsetWidth - list.clientWidth - parseFloat(getComputedStyle(list).borderRightWidth),
            ),
        ).toBe(0);
        await expect.poll(() => width(topics.scrollbarHandle)).toBe(THIN_HANDLE_PX);
        expect(await backgroundAlpha(topics.scrollbarHandle)).toBeGreaterThan(0);
        expect(await backgroundAlpha(topics.scrollbarHandle)).toBeLessThan(1);

        await topics.scrollbarHandle.hover();

        await expect.poll(() => width(topics.scrollbarHandle)).toBe(WIDE_HANDLE_PX);
    });

    test('shows the track under the pointer anywhere along the bar and jumps where it is clicked', async ({
        authenticatedPage: page,
    }) => {
        const topics = await openLongList(page);
        await expect.poll(() => width(topics.scrollbarHandle)).toBe(THIN_HANDLE_PX);
        const track = await topics.scrollbarTrack.boundingBox();
        expect(track).not.toBeNull();
        const clear = { x: (track?.width ?? 0) / 2, y: (track?.height ?? 0) - TRACK_END_OFFSET_PX };

        await topics.scrollbarTrack.hover({ position: clear });

        await expect.poll(() => width(topics.scrollbarHandle)).toBe(WIDE_HANDLE_PX);
        expect(await backgroundAlpha(topics.scrollbarTrack)).toBeGreaterThan(0);

        await topics.scrollbarTrack.click({ position: clear });

        await expect.poll(() => topics.list.evaluate(list => list.scrollTop)).toBeGreaterThan(0);
    });
});
