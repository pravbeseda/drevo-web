import {
    test,
    expect,
    bypassSsr,
    mockAuthApi,
    mockArticlePreview,
    mockNewsCreate,
    mockNewsHistory,
    mockNewsMeta,
    mockNewsSave,
    mockNewsShow,
    mockNewsTopicsApi,
    mockNewsVersion,
    mockNewsVersionShow,
} from '../../fixtures';
import { createArticleHistoryResponse, mockUsers } from '../../mocks';
import { createCreateArticleResponseDto, createSaveArticleVersionResponseDto } from '../../mocks/articles';
import { createNewsVersionDto } from '../../mocks/news';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { NewsPage } from '../../pages/news.page';

/** Well above one line of text: what a collapsed editor shrinks to. */
const MIN_EDITOR_HEIGHT = 300;
const NEWS_ID = 7;
const VERSION_ID = 70;
const NEWS = createNewsVersionDto({ versionId: VERSION_ID, title: 'Престольный праздник', rank: 4 }, NEWS_ID);

test.describe('News editing', () => {
    let news: NewsPage;
    let editor: ArticleEditPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockNewsTopicsApi(page);
        await mockNewsShow(page, NEWS_ID, NEWS);
        await mockArticlePreview(page);
        news = new NewsPage(page);
        editor = new ArticleEditPage(page);
    });

    test('saves an edited news version through the news API and opens the news item', async ({
        authenticatedPage: page,
    }) => {
        await bypassSsr(page, `**/news/${NEWS_ID}/version/${VERSION_ID}/edit`);
        await mockNewsVersion(page, VERSION_ID, NEWS);
        await mockNewsSave(page, createSaveArticleVersionResponseDto({ articleId: NEWS_ID, versionId: 71 }));
        await page.goto(`/news/${NEWS_ID}/version/${VERSION_ID}/edit`);
        await editor.waitForReady();

        await editor.typeInEditor('Новый текст новости');
        const save = page.waitForRequest(request => request.url().endsWith('/api/news/save'));
        await editor.clickSave();

        expect((await save).postDataJSON()).toEqual(expect.objectContaining({ versionId: VERSION_ID }));
        await expect(page).toHaveURL(`/news/${NEWS_ID}`);
    });

    test('creates a news item from the news history', async ({ authenticatedPage: page }) => {
        await mockNewsHistory(page, createArticleHistoryResponse([]));
        await mockNewsCreate(page, createCreateArticleResponseDto({ articleId: NEWS_ID, versionId: VERSION_ID }));
        await page.goto('/history/news');

        await news.addNewsAction.click();
        await expect(page).toHaveURL('/news/new');
        await editor.waitForReady();
        await news.titleInput.fill('Престольный праздник');
        await news.dateInput.fill('2025-01-15');
        await news.topicAction.click();
        await news.topicCheckbox(1).check();
        await news.topicOk.click();
        await editor.typeInEditor('Текст новости');
        const create = page.waitForRequest(request => request.url().endsWith('/api/news/create'));
        await editor.clickSave();

        expect((await create).postDataJSON()).toEqual(
            expect.objectContaining({ title: 'Престольный праздник', newsDate: '2025-01-15', topic: 1 }),
        );
        await expect(page).toHaveURL(`/news/${NEWS_ID}`);
    });

    test('the news editor fills the page, not a single line', async ({ authenticatedPage: page }) => {
        await page.goto('/news/new');
        await editor.waitForReady();

        const box = await editor.editorContainer.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThan(MIN_EDITOR_HEIGHT);
    });

    test('a moderator renames a news item in its editor, and only the title is sent', async ({
        authenticatedPage: page,
    }) => {
        await bypassSsr(page, `**/news/${NEWS_ID}/version/${VERSION_ID}/edit`);
        await mockAuthApi(page, mockUsers.moderator);
        await mockNewsVersion(page, VERSION_ID, NEWS);
        await mockNewsMeta(page, NEWS_ID, {
            articleId: NEWS_ID,
            title: 'Храмовый праздник',
            newsDate: '2025-01-15',
            topics: [1],
            rank: 4,
            numlist: 0,
        });
        await page.goto(`/news/${NEWS_ID}/version/${VERSION_ID}/edit`);
        await editor.waitForReady();

        await news.titleInput.fill('Храмовый праздник');
        const meta = page.waitForRequest(request => request.url().endsWith(`/api/news/${NEWS_ID}/meta`));
        await editor.clickSave();

        expect((await meta).postDataJSON()).toEqual({ title: 'Храмовый праздник' });
        await expect(page).toHaveURL(`/news/${NEWS_ID}`);
    });

    test('a moderator picks the section on a version of a news item, with no table of contents', async ({
        authenticatedPage: page,
    }) => {
        await bypassSsr(page, `**/news/${NEWS_ID}/version/${VERSION_ID}`);
        await mockAuthApi(page, mockUsers.moderator);
        await mockNewsVersionShow(page, VERSION_ID, NEWS);
        await page.goto(`/news/${NEWS_ID}/version/${VERSION_ID}`);
        await news.waitForReady();

        await expect(news.topicAction).toBeVisible();
        await expect(news.tableOfContentsAction).toHaveCount(0);
    });
});
