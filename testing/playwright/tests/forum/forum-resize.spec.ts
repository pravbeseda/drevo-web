import { expect, mockForumSectionsApi, mockForumTopicsApi, test } from '../../fixtures';
import { createForumTopicListItemDto, createForumTopicListResponse } from '../../mocks/forum';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { Locator, Page } from '@playwright/test';

const DEFAULT_WIDTH_PX = 320;
const MIN_WIDTH_PX = 240;
const MAX_SHARE = 0.7;
const DRAG_PX = 100;
/** Far enough to hit either bound whatever the viewport. */
const OVERSHOOT_PX = 2000;

async function openForum(page: Page): Promise<ForumTopicsPage> {
    await mockForumSectionsApi(page);
    await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
    const topics = new ForumTopicsPage(page);
    await page.goto('/forum');
    await topics.waitForReady();
    return topics;
}

const width = async (locator: Locator): Promise<number> => (await locator.boundingBox())?.width ?? 0;

test.describe('Forum topic column width', () => {
    test('follows a drag of its border and survives a reload', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);
        expect(await width(topics.list)).toBe(DEFAULT_WIDTH_PX);

        await topics.dragColumnBorder(DRAG_PX);

        await expect.poll(() => width(topics.list)).toBe(DEFAULT_WIDTH_PX + DRAG_PX);

        await page.reload();
        await topics.waitForReady();

        await expect.poll(() => width(topics.list)).toBe(DEFAULT_WIDTH_PX + DRAG_PX);
    });

    test('stops at its minimum and at 70% of the panes', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);

        await topics.dragColumnBorder(-OVERSHOOT_PX);
        await expect.poll(() => width(topics.list)).toBe(MIN_WIDTH_PX);

        await topics.dragColumnBorder(OVERSHOOT_PX);
        const panes = await width(topics.panes);
        await expect.poll(() => width(topics.list)).toBeCloseTo(panes * MAX_SHARE, 0);
    });

    for (const theme of ['light', 'dark']) {
        test(`lights its border up under the pointer in the ${theme} theme`, async ({ authenticatedPage: page }) => {
            await page.addInitScript(value => localStorage.setItem('drevo-theme', value), theme);
            const topics = await openForum(page);
            const colour = (): Promise<string> =>
                topics.resizeHandle.evaluate(handle => getComputedStyle(handle).backgroundColor);
            const atRest = await colour();

            await topics.resizeHandle.hover();

            expect(await colour()).not.toBe(atRest);
        });
    }

    test('offers no border to drag on a phone', async ({ authenticatedPage: page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const topics = await openForum(page);

        await expect(topics.resizeHandle).toBeHidden();
    });
});
