import {
    expect,
    mockForumMarkReadApi,
    mockForumSectionsApi,
    mockForumTopicApi,
    mockForumTopicPagedApi,
    mockForumTopicsApi,
    test,
} from '../../fixtures';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPage,
    createForumTopicPageOf,
} from '../../mocks/forum';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';

const TOPIC_ID = 7;
const TOPIC_TITLE = 'Тема с новыми сообщениями';
const MESSAGE_COUNT = 20;
const FIRST_UNREAD_ID = 16;
const UNREAD_COUNT = MESSAGE_COUNT - FIRST_UNREAD_ID + 1;

/** Long enough that the unread messages do not fit on one screen, so reading them takes a scroll. */
const MESSAGE_HTML = `<p>${'Текст сообщения, достаточно длинный, чтобы занять несколько строк. '.repeat(6)}</p>`;

const MESSAGES = Array.from({ length: MESSAGE_COUNT }, (_, index) =>
    createForumMessageDto({ html: MESSAGE_HTML }, index + 1),
);

test.describe('Forum unread messages', () => {
    let reported: readonly number[];

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([
                createForumTopicListItemDto({
                    id: TOPIC_ID,
                    title: TOPIC_TITLE,
                    unreadCount: UNREAD_COUNT,
                    firstUnreadId: FIRST_UNREAD_ID,
                }),
            ]),
        );
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, firstUnreadId: FIRST_UNREAD_ID }), MESSAGES),
        );
        reported = await mockForumMarkReadApi(page, TOPIC_ID, { unreadCount: 0 });
    });

    test('counts them on the row, which opens the topic on the first of them', async ({ authenticatedPage: page }) => {
        const topics = new ForumTopicsPage(page);

        await page.goto('/forum');
        await topics.waitForReady();

        await expect(topics.unreadBadge(TOPIC_TITLE)).toHaveText(String(UNREAD_COUNT));
        await expect(topics.link(TOPIC_TITLE)).toHaveAttribute('href', `/forum/topic/${TOPIC_ID}/${FIRST_UNREAD_ID}`);
        expect(await topics.crampedRowCount()).toBe(0);
    });

    test('opens on the unread mark and reports them read as the reader scrolls through', async ({
        authenticatedPage: page,
    }) => {
        const topics = new ForumTopicsPage(page);
        const topic = new ForumTopicPage(page);

        await page.goto('/forum');
        await topics.waitForReady();
        await topics.link(TOPIC_TITLE).click();
        await topic.waitForReady();

        await expect(topic.unreadDivider).toHaveText('Непрочитанные сообщения');
        await expect(topic.unreadDivider).toBeInViewport();
        await expect(topic.message(FIRST_UNREAD_ID)).not.toHaveClass(/message-card--anchored/);
        await expect(topic.message(MESSAGE_COUNT)).not.toBeInViewport();

        await topic.message(MESSAGE_COUNT).scrollIntoViewIfNeeded();

        await expect.poll(() => reported.at(-1)).toBe(MESSAGE_COUNT);
        await expect(topics.unreadBadge(TOPIC_TITLE)).toHaveCount(0);
        await expect(topics.link(TOPIC_TITLE)).toHaveAttribute('href', `/forum/topic/${TOPIC_ID}`);
    });

    test('opens an address that names no message on the first unread one, though it lies on an earlier page', async ({
        authenticatedPage: page,
    }) => {
        const pageSize = 10;
        const lastPage = Math.ceil(MESSAGE_COUNT / pageSize);
        const firstUnreadId = 5;
        const topicDto = createForumTopicDto({ id: TOPIC_ID, firstUnreadId });
        await mockForumTopicPagedApi(page, TOPIC_ID, ({ page: requested, anchor }) =>
            createForumTopicPageOf(
                topicDto,
                MESSAGES,
                anchor === undefined ? (requested ?? lastPage) : Math.ceil(anchor / pageSize),
                pageSize,
            ),
        );
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();

        await expect(topic.unreadDivider).toBeInViewport();
        await expect(topic.message(firstUnreadId)).toBeVisible();
        await expect(topic.message(MESSAGE_COUNT)).toHaveCount(0);
        expect(reported.every(id => id < MESSAGE_COUNT)).toBe(true);
    });
});
