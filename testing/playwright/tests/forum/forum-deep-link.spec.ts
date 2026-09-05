import { expect, mockForumTopicApi, test } from '../../fixtures';
import { createForumMessageDto, createForumTopicDto, createForumTopicPage } from '../../mocks/forum';
import { ForumTopicPage } from '../../pages/forum-topic.page';

const TOPIC_ID = 7;
const MESSAGE_COUNT = 20;
const FIRST_MESSAGE_ID = 1;
const ANCHOR_ID = MESSAGE_COUNT;

/** Long enough that the twenty cards do not fit on one screen, so a scroll is what brings the last one up. */
const MESSAGE_HTML = `<p>${'Текст сообщения, достаточно длинный, чтобы занять несколько строк. '.repeat(6)}</p>`;

const MESSAGES = Array.from({ length: MESSAGE_COUNT }, (_, index) =>
    createForumMessageDto({ html: MESSAGE_HTML }, index + 1),
);

test.describe('Forum deep link to a message', () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockForumTopicApi(page, TOPIC_ID, createForumTopicPage(createForumTopicDto({ id: TOPIC_ID }), MESSAGES));
    });

    test('scrolls to the message the address names and highlights it', async ({ authenticatedPage: page }) => {
        // The mock serves the same page whatever is asked for, so the request is
        // the only place the anchor reaching the backend can be seen.
        const requestedAnchors: string[] = [];
        page.on('request', request => {
            const url = new URL(request.url());
            const anchor = url.searchParams.get('anchor');
            if (anchor && url.pathname.endsWith(`/api/forum/topics/${TOPIC_ID}`)) {
                requestedAnchors.push(anchor);
            }
        });
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}/${ANCHOR_ID}`);
        await topic.waitForReady();

        expect(requestedAnchors).toContain(String(ANCHOR_ID));

        await expect(topic.message(ANCHOR_ID)).toHaveClass(/message-card--anchored/);
        await expect(topic.message(FIRST_MESSAGE_ID)).not.toHaveClass(/message-card--anchored/);

        await expect(topic.message(ANCHOR_ID)).toBeInViewport();
        await expect(topic.message(FIRST_MESSAGE_ID)).not.toBeInViewport();

        expect(await topic.messageBackground(ANCHOR_ID)).not.toBe(await topic.messageBackground(FIRST_MESSAGE_ID));
    });

    test('leaves the topic unanchored and unscrolled when the address names no message', async ({
        authenticatedPage: page,
    }) => {
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();

        await expect(topic.message(ANCHOR_ID)).not.toHaveClass(/message-card--anchored/);
        await expect(topic.message(FIRST_MESSAGE_ID)).toBeInViewport();
    });
});
