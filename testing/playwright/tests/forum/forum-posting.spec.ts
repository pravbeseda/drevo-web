import {
    expect,
    mockArticleShow,
    mockForumCreateTopicApi,
    mockForumReplyApi,
    mockForumSectionsApi,
    mockForumTopicApi,
    mockForumTopicsApi,
    test,
} from '../../fixtures';
import { mockArticleViewData } from '../../mocks/articles';
import {
    createForumCreatedTopicDto,
    createForumMessageDto,
    createForumPostedMessageDto,
    createForumTopicDto,
    createForumTopicListItemDto,
    createForumTopicListResponse,
    createForumTopicPage,
} from '../../mocks/forum';
import { ArticlePage } from '../../pages/article.page';
import { ForumNewTopicPage } from '../../pages/forum-new-topic.page';
import { ForumTopicPage } from '../../pages/forum-topic.page';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { Page, Request } from '@playwright/test';

const TOPIC_ID = 7;
const NEW_TOPIC_ID = 43;
const NEW_MESSAGE_ID = 100;
const ARTICLE_ID = 42;
const TOPIC = createForumTopicDto({ id: TOPIC_ID });
const MESSAGES = [
    createForumMessageDto({ author: { name: 'Петров П.П.', login: 'petrov' } }, 1),
    createForumMessageDto({ author: { name: 'Сидоров С.С.', login: 'sidorov' } }, 2),
];
const NEW_MESSAGE = createForumMessageDto({ html: '<p>Мой ответ</p>' }, NEW_MESSAGE_ID);

/** The body of the first POST to a URL the pattern matches — what the form actually sent. */
function nextPost(page: Page, url: RegExp): Promise<unknown> {
    return page
        .waitForRequest((request: Request) => request.method() === 'POST' && url.test(request.url()))
        .then(request => request.postDataJSON() as unknown);
}

async function openTopic(page: Page): Promise<ForumTopicPage> {
    await mockForumSectionsApi(page);
    await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto({ id: TOPIC_ID })]));
    await mockForumTopicApi(page, TOPIC_ID, createForumTopicPage(TOPIC, MESSAGES));
    const topic = new ForumTopicPage(page);
    await page.goto(`/forum/topic/${TOPIC_ID}`);
    await topic.waitForReady();
    return topic;
}

test.describe('Forum posting', () => {
    test.describe('replying in a topic', () => {
        test('answers a message with the ↩ of its card and shows the answer at the end', async ({
            authenticatedPage: page,
        }) => {
            await mockForumReplyApi(page, TOPIC_ID, createForumPostedMessageDto({ ...NEW_MESSAGE, parentId: 2 }));
            const topic = await openTopic(page);

            await topic.answer(2);
            await expect(topic.replyChipAuthor).toHaveText('Сидоров С.С.');
            await topic.write('Мой ответ');
            const sent = nextPost(page, /\/api\/forum\/topics\/7\/messages$/);
            await topic.send.click();

            expect(await sent).toEqual({ text: 'Мой ответ', parentId: 2 });
            await expect(topic.message(NEW_MESSAGE_ID)).toBeInViewport();
            await expect(topic.replyChip).toHaveCount(0);
            await expect(topic.composerText).not.toContainText('Мой ответ');
        });

        test('answers the topic itself when no message is chosen, sending on Ctrl/⌘+Enter', async ({
            authenticatedPage: page,
        }) => {
            await mockForumReplyApi(page, TOPIC_ID, createForumPostedMessageDto(NEW_MESSAGE));
            const topic = await openTopic(page);

            await topic.write('Мой ответ');
            const sent = nextPost(page, /\/api\/forum\/topics\/7\/messages$/);
            await topic.sendByShortcut();

            expect(await sent).toEqual({ text: 'Мой ответ' });
            await expect(topic.message(NEW_MESSAGE_ID)).toBeVisible();
        });

        test('writes in a field one line high, with no frame or lint column, that grows with the text', async ({
            authenticatedPage: page,
        }) => {
            const topic = await openTopic(page);

            await expect(topic.composerGutter).toBeHidden();
            await expect(topic.composerEditor).toHaveCSS('border-left-width', '0px');
            await expect(topic.composerEditor).toHaveCSS('border-right-width', '0px');
            expect(await topic.composerSpareHeight()).toBe(0);
            const oneLine = await topic.composerHeight();

            await topic.write('Первая строка\nВторая строка');

            expect(await topic.composerSpareHeight()).toBe(0);
            expect(await topic.composerHeight()).toBeGreaterThan(oneLine);
        });

        test('quotes a message from the ⋯ menu of its card', async ({ authenticatedPage: page }) => {
            const topic = await openTopic(page);

            await topic.quote(1);

            await expect(topic.replyChipAuthor).toHaveText('Петров П.П.');
            await expect(topic.composerText).toContainText('> Сообщение 1');
        });

        test('says a reply waits for a moderator instead of showing it', async ({ authenticatedPage: page }) => {
            await mockForumReplyApi(page, TOPIC_ID, createForumPostedMessageDto(NEW_MESSAGE, false));
            const topic = await openTopic(page);

            await topic.write('Мой ответ');
            await topic.send.click();

            await expect(topic.composerPending).toBeVisible();
            await expect(topic.message(NEW_MESSAGE_ID)).toHaveCount(0);
        });

        test('shows why the forum refused a reply and keeps the text', async ({ authenticatedPage: page }) => {
            await mockForumReplyApi(page, TOPIC_ID, { refused: { text: ['Излишнее цитирование!'] } });
            const topic = await openTopic(page);

            await topic.write('> цитата');
            await topic.send.click();

            await expect(topic.composerError).toHaveText('Излишнее цитирование!');
            await expect(topic.composerText).toHaveText('> цитата');
        });
    });

    test.describe('starting a topic', () => {
        test('starts a topic in the section the tab shows and opens it beside the list', async ({
            authenticatedPage: page,
        }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            await mockForumCreateTopicApi(page, createForumCreatedTopicDto(NEW_TOPIC_ID, NEW_MESSAGE));
            await mockForumTopicApi(
                page,
                NEW_TOPIC_ID,
                createForumTopicPage(createForumTopicDto({ id: NEW_TOPIC_ID, title: 'Новая тема о храме' }), [
                    NEW_MESSAGE,
                ]),
            );
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common');
            await form.start.click();
            await form.waitForReady();

            await expect(form.sectionOption('common')).toHaveClass(/mat-button-toggle-checked/);
            await form.fill('Новая тема о храме', 'Первое сообщение');
            const sent = nextPost(page, /\/api\/forum\/topics$/);
            await form.submit.click();

            expect(await sent).toEqual({ part: 'common', title: 'Новая тема о храме', text: 'Первое сообщение' });
            await expect(page).toHaveURL(new RegExp(`/forum/common/topic/${NEW_TOPIC_ID}$`));
            await expect(new ForumTopicPage(page).title).toHaveText('Новая тема о храме');
        });

        test('opens a topic moved to another section in that section’s list', async ({ authenticatedPage: page }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            await mockForumCreateTopicApi(page, createForumCreatedTopicDto(NEW_TOPIC_ID, NEW_MESSAGE));
            await mockForumTopicApi(
                page,
                NEW_TOPIC_ID,
                createForumTopicPage(createForumTopicDto({ id: NEW_TOPIC_ID }), [NEW_MESSAGE]),
            );
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            await form.pickSection('Обсуждение новостей');
            await form.fill('Тема', 'Текст');
            const sent = nextPost(page, /\/api\/forum\/topics$/);
            await form.submit.click();

            expect(await sent).toEqual(expect.objectContaining({ part: 'news' }));
            await expect(page).toHaveURL(new RegExp(`/forum/news/topic/${NEW_TOPIC_ID}$`));
        });

        test('asks before dropping what was written, then returns to the list', async ({ authenticatedPage: page }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            await form.fill('Тема', 'Текст');
            await form.cancel.click();
            await form.discard.click();

            await expect(page).toHaveURL(/\/forum\/common$/);
        });

        test('fills the panel down to the bottom on a phone', async ({ authenticatedPage: page }) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            expect(await new ForumTopicsPage(page).gapBelow(form.editor)).toBe(0);
        });

        test('writes the text with no frame or lint column', async ({ authenticatedPage: page }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            await expect(form.text).toBeVisible();
            await expect(form.gutter).toBeHidden();
            await expect(form.editor).toHaveCSS('border-left-width', '0px');
            await expect(form.editor).toHaveCSS('border-right-width', '0px');
        });

        test('keeps the section picker inside its row on a narrow phone', async ({ authenticatedPage: page }) => {
            await page.setViewportSize({ width: 360, height: 780 });
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            expect(await new ForumTopicsPage(page).panelScrollsSideways()).toBe(false);
        });

        test('asks for the section among every section', async ({ authenticatedPage: page }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            await mockForumCreateTopicApi(page, createForumCreatedTopicDto(NEW_TOPIC_ID, NEW_MESSAGE, false));
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/new');
            await form.waitForReady();

            await form.pickSection('Обсуждение новостей');
            await form.fill('Тема', 'Текст');
            const sent = nextPost(page, /\/api\/forum\/topics$/);
            await form.submit.click();

            expect(await sent).toEqual(expect.objectContaining({ part: 'news' }));
            await expect(form.pending).toBeVisible();
        });

        test('shows a refusal under its field', async ({ authenticatedPage: page }) => {
            await mockForumSectionsApi(page);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            await mockForumCreateTopicApi(page, { refused: { title: ['Заголовок слишком короткий'] } });
            const form = new ForumNewTopicPage(page);
            await page.goto('/forum/common/new');
            await form.waitForReady();

            await form.fill('Т', 'Текст');
            await form.submit.click();

            await expect(form.titleError).toHaveText('Заголовок слишком короткий');
        });

        test('binds a topic started from an article to that article', async ({ authenticatedPage: page }) => {
            await mockArticleShow(page, ARTICLE_ID, mockArticleViewData.single);
            await mockForumTopicsApi(page, createForumTopicListResponse([createForumTopicListItemDto()]));
            await mockForumCreateTopicApi(page, createForumCreatedTopicDto(NEW_TOPIC_ID, NEW_MESSAGE));
            await mockForumTopicApi(
                page,
                NEW_TOPIC_ID,
                createForumTopicPage(createForumTopicDto({ id: NEW_TOPIC_ID }), [NEW_MESSAGE]),
            );
            const article = new ArticlePage(page);
            const form = new ForumNewTopicPage(page);
            await page.goto(`/articles/${ARTICLE_ID}/forum`);
            await article.waitForReady();

            await form.start.click();
            await form.waitForReady();
            await expect(form.owner).toBeVisible();
            await expect(form.section).toHaveCount(0);
            await form.fill('Вопрос по статье', 'Текст');
            const sent = nextPost(page, /\/api\/forum\/topics$/);
            await form.submit.click();

            expect(await sent).toEqual(expect.objectContaining({ part: 'articles', partId: ARTICLE_ID }));
            await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}/forum/topic/${NEW_TOPIC_ID}$`));
        });
    });
});
