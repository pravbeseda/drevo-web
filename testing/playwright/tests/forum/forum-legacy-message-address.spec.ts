import {
    expect,
    mockForumMessageNotFound,
    mockForumMessageTopicApi,
    mockForumSectionsApi,
    mockForumTopicApi,
    mockForumTopicNotFound,
    mockForumTopicsApi,
    test,
} from '../../fixtures';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPage,
} from '../../mocks/forum';
import { ForumTopicPage } from '../../pages/forum-topic.page';

const TOPIC_ID = 7;
const REPLY_ID = 3;
const GONE_MESSAGE_ID = 99;

const MESSAGES = [TOPIC_ID, REPLY_ID].map(id => createForumMessageDto({}, id));

test.describe('Forum legacy message address', () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
        await mockForumTopicApi(page, TOPIC_ID, createForumTopicPage(createForumTopicDto({ id: TOPIC_ID }), MESSAGES));
    });

    test('opens the topic of a reply, anchored on the reply', async ({ authenticatedPage: page }) => {
        await mockForumMessageTopicApi(page, REPLY_ID, TOPIC_ID);
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/${REPLY_ID}`);
        await topic.waitForReady();

        await expect(page).toHaveURL(`/forum/topic/${TOPIC_ID}/${REPLY_ID}`);
        await expect(topic.message(REPLY_ID)).toHaveClass(/message-card--anchored/);
    });

    test('opens a topic addressed by its root message', async ({ authenticatedPage: page }) => {
        await mockForumMessageTopicApi(page, TOPIC_ID, TOPIC_ID);
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/${TOPIC_ID}`);
        await topic.waitForReady();

        await expect(page).toHaveURL(`/forum/topic/${TOPIC_ID}/${TOPIC_ID}`);
        await expect(topic.message(TOPIC_ID)).toHaveClass(/message-card--anchored/);
    });

    test('answers a message that is gone with the topic not-found page', async ({ authenticatedPage: page }) => {
        await mockForumMessageNotFound(page, GONE_MESSAGE_ID);
        await mockForumTopicNotFound(page, GONE_MESSAGE_ID);

        await page.goto(`/forum/${GONE_MESSAGE_ID}`);

        await expect(page).toHaveURL(`/forum/topic/${GONE_MESSAGE_ID}`);
        await expect(new ForumTopicPage(page).notFound).toBeVisible();
    });
});
