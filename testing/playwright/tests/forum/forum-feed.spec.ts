import { expect, mockForumSectionsApi, mockForumTopicPagedApi, mockForumTopicsApi, test } from '../../fixtures';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPageOf,
} from '../../mocks/forum';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';

const TOPIC_ID = 7;
const PAGE_SIZE = 20;
const MESSAGE_COUNT = 2 * PAGE_SIZE;
const FIRST_OF_SECOND_PAGE = PAGE_SIZE + 1;
const ANCHOR_ID = PAGE_SIZE + 5;
/** The width of the scrollbar handle at rest, as the lists draw it. */
const THIN_HANDLE_PX = 4;
/** Sub-pixel rounding of a layout that moved by a whole page of cards. */
const POSITION_TOLERANCE_PX = 2;

/** Long enough that one page overflows the panel, so reaching an end takes a scroll. */
const MESSAGE_HTML = `<p>${'Текст сообщения, достаточно длинный, чтобы занять несколько строк. '.repeat(4)}</p>`;

const TOPIC = createForumTopicDto({ id: TOPIC_ID });
const MESSAGES = Array.from({ length: MESSAGE_COUNT }, (_, index) =>
    createForumMessageDto({ html: MESSAGE_HTML }, index + 1),
);

const pageOf = (page: number) => createForumTopicPageOf(TOPIC, MESSAGES, page, PAGE_SIZE);

test.describe('Forum topic feed', () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
    });

    test('loads the next page once the reader scrolls to the end', async ({ authenticatedPage: page }) => {
        await mockForumTopicPagedApi(page, TOPIC_ID, ({ page: requested }) => pageOf(requested ?? 1));
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();
        await expect(topic.message(MESSAGE_COUNT)).toHaveCount(0);

        await topic.scrollTo('bottom');

        await expect(topic.message(MESSAGE_COUNT)).toBeAttached();
    });

    test('keeps the reader on the same message when the earlier page arrives above it', async ({
        authenticatedPage: page,
    }) => {
        let releaseFirstPage: () => void = () => undefined;
        const firstPageHeld = new Promise<void>(resolve => (releaseFirstPage = resolve));
        await mockForumTopicPagedApi(page, TOPIC_ID, async ({ page: requested, anchor }) => {
            if (anchor !== undefined) {
                return pageOf(2);
            }
            await firstPageHeld;
            return pageOf(requested ?? 1);
        });
        const topic = new ForumTopicPage(page);
        // The top end may already be on screen before the anchor scroll moves it
        // away, so the request can leave as soon as the topic renders.
        const earlierPageRequested = page.waitForRequest(
            request => new URL(request.url()).searchParams.get('page') === '1',
        );

        await page.goto(`/forum/topic/${TOPIC_ID}/${ANCHOR_ID}`);
        await topic.waitForReady();
        await expect(topic.message(ANCHOR_ID)).toBeInViewport();

        await topic.scrollTo('top');
        await earlierPageRequested;
        const before = await topic.message(FIRST_OF_SECOND_PAGE).boundingBox();

        releaseFirstPage();
        await expect(topic.message(1)).toBeAttached();

        await expect
            .poll(async () =>
                Math.abs(((await topic.message(FIRST_OF_SECOND_PAGE).boundingBox())?.y ?? 0) - (before?.y ?? 0)),
            )
            .toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
    });

    test('scrolls the feed alone, under the floating scrollbar of the lists, and keeps the composer below it', async ({
        authenticatedPage: page,
    }) => {
        await mockForumTopicPagedApi(page, TOPIC_ID, ({ page: requested }) => pageOf(requested ?? 1));
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();
        await topic.feed.hover();

        expect(await topic.feed.evaluate(feed => feed.scrollHeight > feed.clientHeight)).toBe(true);
        expect(await new ForumTopicsPage(page).panel.evaluate(panel => panel.scrollHeight > panel.clientHeight)).toBe(
            false,
        );
        await expect.poll(async () => (await topic.feedScrollbarHandle.boundingBox())?.width).toBe(THIN_HANDLE_PX);
        const [feed, composer] = await Promise.all([topic.feed.boundingBox(), topic.composer.boundingBox()]);
        expect(Math.round(composer?.y ?? 0)).toBeGreaterThanOrEqual(Math.round((feed?.y ?? 0) + (feed?.height ?? 0)));
    });
});
