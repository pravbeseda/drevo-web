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
import { ForumFilterPage } from '../../pages/forum-filter.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { LayoutPage } from '../../pages/layout.page';

const SECTION = mockForumSections[0];
const TOPIC_ID = 7;
const TOPIC_TITLE = 'Тема о преподобном Сергии';
const MESSAGE_ID = 11;
const MESSAGE_AUTHOR = 'Сидоров С.С.';
const ARTICLE_ID = 15;
const ARTICLE_TITLE = 'Сергий Радонежский';

test.describe('Forum navigation', () => {
    test('opens on every section, narrows to one through the filter and walks into a topic', async ({
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
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }), [
                createForumMessageDto({ id: MESSAGE_ID, author: { name: MESSAGE_AUTHOR } }),
            ]),
        );

        const filter = new ForumFilterPage(page);
        const topics = new ForumTopicsPage(page);

        await page.goto('/forum');
        await topics.waitForReady();

        // The forum opens on the topics of every section, not on a list of sections.
        await expect(filter.button).toBeVisible();
        await expect(filter.current).toBeHidden();
        await expect(topics.title(TOPIC_TITLE)).toBeVisible();

        await filter.pick(SECTION.id);
        await topics.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/${SECTION.id}$`));
        await expect(filter.current).toHaveText(SECTION.name);

        await topics.open(TOPIC_TITLE);

        const topic = new ForumTopicPage(page);
        await topic.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/topic/${TOPIC_ID}$`));
        await expect(topic.title).toHaveText(TOPIC_TITLE);
        await expect(topic.message(MESSAGE_ID)).toContainText(MESSAGE_AUTHOR);
        // The topic's own title names the tab — the route resolves it, nothing on the page does.
        await expect(page).toHaveTitle(`${TOPIC_TITLE} - Древо`);
        // The topic opens beside the list it was picked from, so both the filter
        // and the row stay on screen at desktop width.
        await expect(filter.button).toBeVisible();
        await expect(topics.title(TOPIC_TITLE)).toBeVisible();

        // Beside, not above: a visible row says nothing about which way the panes run.
        const row = await topics.items.first().boundingBox();
        const feed = await topic.feed.boundingBox();
        expect(feed?.x ?? 0).toBeGreaterThan((row?.x ?? 0) + (row?.width ?? 0));

        await filter.pick();
        await expect(page).toHaveURL(/\/forum$/);
        await expect(filter.current).toBeHidden();
    });

    test('names the article a topic hangs off under its title, and opens straight on the feed', async ({
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
            createForumTopicPage(
                createForumTopicDto({
                    id: TOPIC_ID,
                    title: TOPIC_TITLE,
                    part: 'articles',
                    partId: ARTICLE_ID,
                    article: { id: ARTICLE_ID, title: ARTICLE_TITLE },
                }),
                [createForumMessageDto({ id: MESSAGE_ID })],
            ),
        );
        const topic = new ForumTopicPage(page);
        const topics = new ForumTopicsPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await topic.waitForReady();

        await expect(topic.title).toHaveText(TOPIC_TITLE);
        await expect(topic.subtitle).toHaveText(`к статье ${ARTICLE_TITLE}`);
        await expect(topic.subtitleLink).toHaveAttribute('href', `/articles/${ARTICLE_ID}`);
        // Nothing heads the feed any more: it starts where the panel does.
        const panel = await topics.panel.boundingBox();
        const feed = await topic.feed.boundingBox();
        expect(Math.round(feed?.y ?? -1)).toBe(Math.round(panel?.y ?? 0));

        await topic.subtitleLink.click();
        await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}$`));
    });

    test('names a news item as one, and gives a topic that hangs off nothing no subtitle', async ({
        authenticatedPage: page,
    }) => {
        const newsTopicId = TOPIC_ID + 1;
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([
                createForumTopicListItemDto({ id: TOPIC_ID, title: TOPIC_TITLE }),
                createForumTopicListItemDto({ id: newsTopicId, title: 'Трансляция' }),
            ]),
        );
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }), [
                createForumMessageDto({ id: MESSAGE_ID }),
            ]),
        );
        await mockForumTopicApi(
            page,
            newsTopicId,
            createForumTopicPage(
                createForumTopicDto({
                    id: newsTopicId,
                    title: 'Трансляция',
                    part: 'news',
                    partId: 9,
                    article: { id: 9, title: 'Престольный праздник' },
                }),
                [createForumMessageDto({ id: MESSAGE_ID + 1 })],
            ),
        );
        const topic = new ForumTopicPage(page);
        const topics = new ForumTopicsPage(page);

        await page.goto(`/forum/topic/${newsTopicId}`);
        await topic.waitForReady();
        await expect(topic.subtitle).toHaveText('к новости Престольный праздник');
        await expect(topic.subtitleLink).toHaveAttribute('href', '/articles/9');

        await topics.open(TOPIC_TITLE);
        await expect(topic.title).toHaveText(TOPIC_TITLE);
        await expect(topic.subtitle).toBeHidden();
    });

    test('opens a topic from anywhere on its row and marks the row as open', async ({ authenticatedPage: page }) => {
        const otherTitle = 'Другая тема';
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([
                createForumTopicListItemDto({ id: 3, title: otherTitle }),
                createForumTopicListItemDto({
                    id: TOPIC_ID,
                    title: TOPIC_TITLE,
                    article: { id: 15, title: 'Сергий Радонежский' },
                    section: { id: 'articles', name: 'Обсуждение статей' },
                }),
            ]),
        );
        await mockForumTopicApi(
            page,
            TOPIC_ID,
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }), [
                createForumMessageDto({ id: MESSAGE_ID }),
            ]),
        );

        const topics = new ForumTopicsPage(page);
        const topic = new ForumTopicPage(page);

        await page.goto('/forum');
        await topics.waitForReady();
        // The article line is part of the row's one link, not a way to the article.
        await topics.context(TOPIC_TITLE).click();
        await topic.waitForReady();

        await expect(page).toHaveURL(new RegExp(`/forum/topic/${TOPIC_ID}$`));
        await expect(topics.link(TOPIC_TITLE)).toHaveAttribute('aria-current', 'page');
        await expect(topics.link(otherTitle)).not.toHaveAttribute('aria-current');
    });

    test('replaces the list with the topic on a phone', async ({ authenticatedPage: page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
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

        const topics = new ForumTopicsPage(page);
        const topic = new ForumTopicPage(page);

        await page.goto('/forum');
        await topics.waitForReady();
        await topics.open(TOPIC_TITLE);
        await topic.waitForReady();

        // One pane at a time: the panel took the list's place rather than sitting beside it.
        await expect(topic.title).toBeVisible();
        await expect(topics.items.first()).toBeHidden();

        // …and all of its height, so the composer sits at the bottom.
        expect(await topics.gapBelow(topics.panel)).toBe(0);

        // With the list gone, the way back to it takes the menu's place.
        const layout = new LayoutPage(page);
        await expect(layout.hamburgerButton).toBeHidden();
        await layout.backButton.click();

        await expect(page).toHaveURL(/\/forum$/);
        await expect(topics.items.first()).toBeVisible();
        await expect(layout.hamburgerButton).toBeVisible();
        await expect(layout.backButton).toBeHidden();
    });

    test('offers the way back beside the menu on a tablet, where the sidebar leaves the topic no room for the list', async ({
        authenticatedPage: page,
    }) => {
        // Past the tablet breakpoint the sidebar is a column, so the panes get less than their two-column width.
        await page.setViewportSize({ width: 820, height: 900 });
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
        const layout = new LayoutPage(page);
        const topics = new ForumTopicsPage(page);

        await page.goto(`/forum/${SECTION.id}/topic/${TOPIC_ID}`);
        await new ForumTopicPage(page).waitForReady();

        await expect(topics.items.first()).toBeHidden();
        // The menu still collapses the sidebar here, so the arrow joins it rather than replacing it.
        await expect(layout.hamburgerButton).toBeVisible();
        await layout.backButton.click();

        await expect(page).toHaveURL(new RegExp(`/forum/${SECTION.id}$`));
        await expect(topics.items.first()).toBeVisible();
        await expect(layout.backButton).toBeHidden();
    });

    test('keeps the menu at desktop width, where the list stays beside the topic', async ({
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
            createForumTopicPage(createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }), [
                createForumMessageDto({ id: MESSAGE_ID }),
            ]),
        );
        const layout = new LayoutPage(page);

        await page.goto(`/forum/topic/${TOPIC_ID}`);
        await new ForumTopicPage(page).waitForReady();

        await expect(layout.hamburgerButton).toBeVisible();
        await expect(layout.backButton).toBeHidden();
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
        await mockForumSectionsApi(page);
        await mockForumTopicNotFound(page, TOPIC_ID);
        // A route table that let `:part` match first would serve this list here instead.
        await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));

        await page.goto(`/forum/topic/${TOPIC_ID}`);

        const topic = new ForumTopicPage(page);
        await expect(topic.notFound).toBeVisible();
        // The list renders beside the panel, so a row here proves the topic
        // address reached the topic route rather than the section's list.
        await expect(new ForumTopicsPage(page).items).toHaveCount(1);
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
