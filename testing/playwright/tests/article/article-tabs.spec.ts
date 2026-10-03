import {
    test,
    expect,
    mockArticleShow,
    mockArticleVersionShow,
    mockArticleHistory,
    mockArticleHistoryError,
    mockForumTopicsApi,
    mockForumTopicsPagedApi,
    mockForumTopicApi,
} from '../../fixtures';
import { createArticleHistoryResponse, mockArticleViewData } from '../../mocks/articles';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListPage,
    createForumTopicListResponse,
    createForumTopicPage,
} from '../../mocks/forum';
import { ArticlePage } from '../../pages/article.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { Locator } from '@playwright/test';

/** Where the element's text starts on screen — past its own padding, unlike its box. */
const textLeft = (locator: Locator): Promise<number> =>
    locator.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().left;
    });

const ARTICLE_ID = 42;
const VERSION_ID = 99;
const ARTICLE = mockArticleViewData.single;
const VERSION = mockArticleViewData.version;

test.describe('Article tabs', () => {
    let article: ArticlePage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);
        article = new ArticlePage(page);
        await page.goto(`/articles/${ARTICLE_ID}`);
        await article.waitForReady();
    });

    test.describe('Stub tabs', () => {
        test('news tab shows stub content', async () => {
            await article.tabNews.click();
            await expect(article.stub).toBeVisible();
        });
    });

    test.describe('Forum tab', () => {
        test('lists the discussions of this article', async ({ authenticatedPage: page }) => {
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));

            await article.tabForum.click();

            await expect(article.forumTopics).toHaveCount(1);
        });

        test('loads the next discussions as the reader scrolls', async ({ authenticatedPage: page }) => {
            const PAGE_SIZE = 20;
            await mockForumTopicsPagedApi(page, requested => createForumTopicListPage(requested, PAGE_SIZE * 2));

            await article.tabForum.click();
            await expect(article.forumTopics.first()).toBeVisible();

            await expect(async () => {
                await article.forumScroller.evaluate(scroller => scroller.scrollTo({ top: scroller.scrollHeight }));
                await expect(article.forumTopic(`Тема ${PAGE_SIZE * 2}`)).toBeVisible({ timeout: 500 });
            }).toPass();
        });

        test('opens a discussion beside the list without leaving the article', async ({ authenticatedPage: page }) => {
            // The root message carries the topic's id, as the forum stores it.
            const TOPIC_ID = 1;
            const ANSWERED_ID = 2;
            const message = (id: number, parentId: number) =>
                createForumMessageDto({ html: `<p>${'Текст сообщения. '.repeat(20)}</p>`, parentId }, id);
            const TOPIC_TITLE = 'Обсуждение статьи';
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
                        article: { id: ARTICLE_ID, title: 'Статья' },
                    }),
                    // Long enough that the panel has to scroll something. Every reply
                    // but one goes to the topic itself; that one answers a message.
                    [
                        message(TOPIC_ID, 0),
                        message(ANSWERED_ID, TOPIC_ID),
                        message(3, ANSWERED_ID),
                        ...Array.from({ length: 17 }, (_, index) => message(index + 4, TOPIC_ID)),
                    ],
                ),
            );
            const topic = new ForumTopicPage(page);

            await article.tabForum.click();
            await article.forumTopic(TOPIC_TITLE).click();
            await topic.waitForReady();

            // The topic is addressed under the article, so the tab and the list stay.
            await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}/forum/topic/${TOPIC_ID}$`));
            await expect(article.forumTopics).toHaveCount(1);
            // The article already heads the page, so the topic names no article under its title.
            await expect(topic.subtitle).toBeHidden();

            // The panes are bounded by the screen and scroll inside themselves; an
            // unbounded pane grows with the topic and takes the tab's scroll instead.
            const panes = await article.forumPanes.boundingBox();
            const viewport = page.viewportSize();
            expect(panes?.height ?? 0).toBeLessThanOrEqual(viewport?.height ?? 0);

            // Only the reply to a message links back; replies to the topic quote nothing.
            await expect(topic.replyTo).toHaveCount(1);
            // «в ответ на» is a link inside the topic, and it stays inside the article too.
            await topic.replyTo.click();
            await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}/forum/topic/${TOPIC_ID}/${ANSWERED_ID}$`));
        });

        test('states that the article has no discussions yet', async ({ authenticatedPage: page }) => {
            await mockForumTopicsApi(page);

            await article.tabForum.click();

            await expect(article.forumEmpty).toBeVisible();
            const list = await article.forumList.boundingBox();
            expect(await textLeft(article.forumEmpty)).toBeGreaterThan(list?.x ?? Number.POSITIVE_INFINITY);
        });
    });

    test.describe('History tab', () => {
        test('shows empty state when no history items', async ({ authenticatedPage: page }) => {
            await mockArticleHistory(page, ARTICLE_ID, createArticleHistoryResponse([]));
            await article.tabHistory.click();
            await expect(article.historyEmpty).toBeVisible();
        });

        test('shows error when history fails to load', async ({ authenticatedPage: page }) => {
            await mockArticleHistoryError(page, ARTICLE_ID);
            await article.tabHistory.click();
            await expect(article.historyError).toBeVisible();
        });
    });

    test.describe('Version tab navigation', () => {
        test('clicking article tab from version route returns to content', async ({ authenticatedPage: page }) => {
            await mockArticleVersionShow(page, VERSION_ID, VERSION);
            await page.goto(`/articles/${ARTICLE_ID}/version/${VERSION_ID}`);
            await article.versionBanner.waitFor({ state: 'visible' });

            await article.tabArticle.click();
            await expect(article.content).toBeVisible();
            await expect(article.versionBanner).toBeHidden();
        });
    });

    test.describe('Direct URL navigation', () => {
        test('navigating directly to stub tab URL shows stub content', async ({ authenticatedPage: page }) => {
            await page.goto(`/articles/${ARTICLE_ID}/news`);
            await article.waitForReady();
            await expect(article.stub).toBeVisible();
        });
    });
});
