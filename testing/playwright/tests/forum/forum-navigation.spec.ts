import {
    bypassSsr,
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
import { ForumSectionsPage } from '../../pages/forum-sections.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';

const SECTION = mockForumSections[0];
const TOPIC_ID = 7;
const TOPIC_TITLE = 'Тема о преподобном Сергии';
const TOPIC_AUTHOR = 'Петров П.П.';
const MESSAGE_ID = 11;
const MESSAGE_AUTHOR = 'Сидоров С.С.';

test.describe('Forum navigation', () => {
    test('walks from the sections to a section and into a topic', async ({ authenticatedPage: page }) => {
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

        const sections = new ForumSectionsPage(page);
        await page.goto('/forum');
        await sections.waitForReady();

        await expect(sections.items).toHaveCount(mockForumSections.length);
        await expect(sections.link(SECTION.name)).toBeVisible();

        await sections.open(SECTION.name);

        const topics = new ForumTopicsPage(page);
        await topics.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/${SECTION.id}$`));
        await expect(topics.title(TOPIC_TITLE)).toBeVisible();

        await topics.open(TOPIC_TITLE);

        const topic = new ForumTopicPage(page);
        await topic.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/topic/${TOPIC_ID}$`));
        await expect(topic.title).toHaveText(TOPIC_TITLE);
        await expect(topic.author).toHaveText(TOPIC_AUTHOR);
        await expect(topic.message(MESSAGE_ID)).toContainText(MESSAGE_AUTHOR);
        // The topic's own title names the tab — the route resolves it, nothing on the page does.
        await expect(page).toHaveTitle(`${TOPIC_TITLE} - Древо`);
    });

    test('answers a topic that is gone with the topic not-found page', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/forum/**');
        await mockForumTopicNotFound(page, TOPIC_ID);
        // A route table that let `:part` match first would serve this list here instead.
        await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));

        await page.goto(`/forum/topic/${TOPIC_ID}`);

        const topic = new ForumTopicPage(page);
        await expect(topic.notFound).toBeVisible();
        await expect(new ForumTopicsPage(page).items).toHaveCount(0);
    });

    test('answers an unknown section with the section not-found page', async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/forum/**');
        await mockForumTopicsUnknownPart(page);

        await page.goto('/forum/nonexistent');

        const topics = new ForumTopicsPage(page);
        await expect(topics.notFound).toBeVisible();
        await expect(new ForumTopicPage(page).notFound).toBeHidden();
    });
});
