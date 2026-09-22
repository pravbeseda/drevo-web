import {
    test,
    expect,
    mockArticleShow,
    mockArticleVersionShow,
    mockArticleHistory,
    mockArticleHistoryError,
    mockForumTopicsApi,
    mockForumTopicApi,
} from '../../fixtures';
import { createArticleHistoryResponse, mockArticleViewData } from '../../mocks/articles';
import {
    createForumMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPage,
} from '../../mocks/forum';
import { ArticlePage } from '../../pages/article.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';

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
            await expect(article.forumAllTopics).toHaveAttribute('href', `/forum/articles/${ARTICLE_ID}`);
        });

        test('opens a discussion beside the list without leaving the article', async ({ authenticatedPage: page }) => {
            const TOPIC_ID = 7;
            const TOPIC_TITLE = 'Обсуждение статьи';
            await mockForumTopicsApi(
                page,
                createForumTopicListResponse([createForumTopicListItemDto({ id: TOPIC_ID, title: TOPIC_TITLE })]),
            );
            await mockForumTopicApi(
                page,
                TOPIC_ID,
                createForumTopicPage(
                    createForumTopicDto({ id: TOPIC_ID, title: TOPIC_TITLE }),
                    // Long enough that the panel has to scroll something.
                    Array.from({ length: 20 }, (_, index) =>
                        createForumMessageDto(
                            { html: `<p>${'Текст сообщения. '.repeat(20)}</p>`, parentId: index === 0 ? 0 : 1 },
                            index + 1,
                        ),
                    ),
                ),
            );
            const topic = new ForumTopicPage(page);

            await article.tabForum.click();
            await article.forumTopic(TOPIC_TITLE).click();
            await topic.waitForReady();

            // The topic is addressed under the article, so the tab and the list stay.
            await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}/forum/topic/${TOPIC_ID}$`));
            await expect(article.forumTopics).toHaveCount(1);

            // The panes are bounded by the screen and scroll inside themselves; an
            // unbounded pane grows with the topic and takes the tab's scroll instead.
            const panes = await article.forumPanes.boundingBox();
            const viewport = page.viewportSize();
            expect(panes?.height ?? 0).toBeLessThanOrEqual(viewport?.height ?? 0);

            // «в ответ на» is a link inside the topic, and it stays inside the article too.
            await topic.replyTo.first().click();
            await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}/forum/topic/${TOPIC_ID}/1$`));
        });

        test('states that the article has no discussions yet', async ({ authenticatedPage: page }) => {
            await mockForumTopicsApi(page);

            await article.tabForum.click();

            await expect(article.forumEmpty).toBeVisible();
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
