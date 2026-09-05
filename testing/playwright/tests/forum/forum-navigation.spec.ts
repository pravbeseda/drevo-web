import {
    expect,
    mockForumSectionsApi,
    mockForumTopicApi,
    mockForumTopicNotFound,
    mockForumTopicsApi,
    mockForumTopicsUnknownPart,
    test,
} from '../../fixtures';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPage,
    mockForumSections,
} from '../../mocks/forum';
import { ForumTabsPage } from '../../pages/forum-tabs.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';

const SECTION = mockForumSections[0];
const TOPIC_ID = 7;
const TOPIC_TITLE = 'Тема о преподобном Сергии';
const TOPIC_AUTHOR = 'Петров П.П.';
const MESSAGE_ID = 11;
const MESSAGE_AUTHOR = 'Сидоров С.С.';

test.describe('Forum navigation', () => {
    test('opens on every section, switches to one by its tab and walks into a topic', async ({
        authenticatedPage: page,
    }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([createForumTopicListItemDto({ id: TOPIC_ID, title: TOPIC_TITLE })]),
        );
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE, author: TOPIC_AUTHOR }), [
                createForumMessageDto({ id: MESSAGE_ID, author: { name: MESSAGE_AUTHOR } }),
            ]),
        );

        const tabs = new ForumTabsPage(page);
        const topics = new ForumTopicsPage(page);

        await page.goto('/forum');
        await tabs.waitForReady();
        await topics.waitForReady();

        // The forum opens on the topics of every section, not on a list of sections.
        await expect(tabs.tabs).toHaveCount(mockForumSections.length + 1);
        await expect(tabs.allTopics).toHaveAttribute('aria-selected', 'true');
        await expect(topics.title(TOPIC_TITLE)).toBeVisible();

        await tabs.open(SECTION.id);
        await topics.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/${SECTION.id}$`));
        // «All topics» is the prefix of every section address and must not stay active with it.
        await expect(tabs.tab(SECTION.id)).toHaveAttribute('aria-selected', 'true');
        await expect(tabs.allTopics).toHaveAttribute('aria-selected', 'false');

        await topics.open(TOPIC_TITLE);

        const topic = new ForumTopicPage(page);
        await topic.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/topic/${TOPIC_ID}$`));
        await expect(topic.title).toHaveText(TOPIC_TITLE);
        await expect(topic.author).toHaveText(TOPIC_AUTHOR);
        await expect(topic.message(MESSAGE_ID)).toContainText(MESSAGE_AUTHOR);
        // The topic's own title names the tab — the route resolves it, nothing on the page does.
        await expect(page).toHaveTitle(`${TOPIC_TITLE} - Древо`);
        // A topic is not a section, so the section tabs are gone.
        await expect(tabs.tabs).toHaveCount(0);
    });

    test('loads the topic again when the reader comes back to it', async ({ authenticatedPage: page }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([createForumTopicListItemDto({ id: TOPIC_ID, title: TOPIC_TITLE })]),
        );
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }), [
                createForumMessageDto({ id: MESSAGE_ID }),
            ]),
        );

        // The page-scoped data service outlives the activation that built it, so
        // only a second visit to one address tells a cache bound to the
        // navigation from one bound to the address alone.
        let topicRequests = 0;
        page.on('request', request => {
            if (new URL(request.url()).pathname.endsWith(`/api/forum/topics/${TOPIC_ID}`)) {
                topicRequests += 1;
            }
        });

        const topics = new ForumTopicsPage(page);
        const topic = new ForumTopicPage(page);

        await page.goto(`/forum/${SECTION.id}`);
        await topics.waitForReady();
        await topics.open(TOPIC_TITLE);
        await topic.waitForReady();

        await page.goBack();
        await topics.waitForReady();
        await topics.open(TOPIC_TITLE);
        await topic.waitForReady();

        await expect.poll(() => topicRequests).toBe(2);
    });

    test('answers a topic that is gone with the topic not-found page', async ({ authenticatedPage: page }) => {
        await mockForumTopicNotFound(page, TOPIC_ID);
        // A route table that let `:part` match first would serve this list here instead.
        await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));

        await page.goto(`/forum/topic/${TOPIC_ID}`);

        const topic = new ForumTopicPage(page);
        await expect(topic.notFound).toBeVisible();
        await expect(new ForumTopicsPage(page).items).toHaveCount(0);
    });

    test('answers an unknown section with the section not-found page', async ({ authenticatedPage: page }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsUnknownPart(page);

        await page.goto('/forum/nonexistent');

        const topics = new ForumTopicsPage(page);
        await expect(topics.notFound).toBeVisible();
        await expect(new ForumTopicPage(page).notFound).toBeHidden();
    });
});
