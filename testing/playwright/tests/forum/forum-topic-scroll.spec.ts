import { expect, mockForumSectionsApi, mockForumTopicApi, mockForumTopicsPagedApi, test } from '../../fixtures';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListPage,
    createForumTopicPage,
} from '../../mocks/forum';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { LayoutPage } from '../../pages/layout.page';
import { Page } from '@playwright/test';

const PAGE_SIZE = 30;
const TOTAL = 90;
const TOPIC_ID = 7;
/** From the default 100% to the largest scale the reader can pick, 150%, in steps of 10%. */
const FONT_SCALE_STEPS_TO_MAX = 5;

async function openForum(page: Page, total = TOTAL): Promise<ForumTopicsPage> {
    await mockForumSectionsApi(page);
    await mockForumTopicsPagedApi(page, requested => createForumTopicListPage(requested, total, PAGE_SIZE));
    const topics = new ForumTopicsPage(page);
    await page.goto('/forum');
    await topics.waitForReady();
    return topics;
}

const FIRST_OF_PAGE_TWO = `Тема ${PAGE_SIZE + 1}`;

/**
 * Scrolls to the end until the last topic shows up, loading every page on the
 * way. Only the last one: rows scrolled past leave the page, so a topic
 * higher up may be gone by the time it is looked for.
 */
async function scrollToLast(topics: ForumTopicsPage, total: number): Promise<void> {
    await expect(async () => {
        await topics.scrollToEnd();
        await expect(topics.title(`Тема ${total}`)).toBeVisible({ timeout: 500 });
    }).toPass();
}

test.describe('Forum topic list scrolling', () => {
    test('loads the next page as the reader scrolls', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);
        await expect(topics.title(FIRST_OF_PAGE_TWO)).toHaveCount(0);

        await topics.scrollToEnd();

        await expect(topics.title(FIRST_OF_PAGE_TWO)).toBeVisible();
    });

    test('keeps only the rows around the viewport in the page', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);

        await scrollToLast(topics, TOTAL);

        await expect(topics.exactTitle('Тема 1')).toHaveCount(0);
        expect(await topics.items.count()).toBeLessThan(TOTAL);
    });

    test('keeps the padding of every row around its text at the largest font', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);
        const layout = new LayoutPage(page);

        await layout.openFontScalePopup();
        for (let step = 0; step < FONT_SCALE_STEPS_TO_MAX; step++) {
            await layout.fontScaleIncrease.click();
        }
        await layout.closeFontScalePopup();

        expect(await topics.crampedRowCount()).toBe(0);
    });

    test('reports a failed page below the rows and loads it again on retry', async ({ authenticatedPage: page }) => {
        let failNextPage = true;
        await mockForumSectionsApi(page);
        await mockForumTopicsPagedApi(page, requested => {
            if (requested > 1 && failNextPage) {
                return 'server-error';
            }
            return createForumTopicListPage(requested, TOTAL, PAGE_SIZE);
        });
        const topics = new ForumTopicsPage(page);
        await page.goto('/forum');
        await topics.waitForReady();

        await topics.scrollToEnd();
        await expect(topics.loadError).toHaveText('Не удалось загрузить');
        failNextPage = false;
        await topics.retry.click();

        await expect(topics.title(FIRST_OF_PAGE_TWO)).toBeVisible();
        await expect(topics.loadError).toHaveCount(0);
    });

    test('fills the screen with rows when the list comes back from behind a topic on a phone', async ({
        authenticatedPage: page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mockForumSectionsApi(page);
        await mockForumTopicsPagedApi(page, requested => createForumTopicListPage(requested, TOTAL, PAGE_SIZE));
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID }), [createForumMessageDto({ id: 11 })]),
        );
        const layout = new LayoutPage(page);
        const topic = new ForumTopicPage(page);
        const topics = new ForumTopicsPage(page);

        // The list is laid out while the topic hides it, so it first measures itself as having no height.
        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();
        await layout.backButton.click();
        await topics.waitForReady();

        const listHeight = (await topics.scroller.boundingBox())?.height ?? 0;
        const rowHeight = (await topics.items.first().boundingBox())?.height ?? 0;
        await expect.poll(() => topics.items.count()).toBeGreaterThanOrEqual(Math.ceil(listHeight / rowHeight));
    });
});
