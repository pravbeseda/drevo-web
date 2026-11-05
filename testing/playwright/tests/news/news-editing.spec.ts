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
} from '../../fixtures';
import { createArticleHistoryResponse, mockUsers } from '../../mocks';
import { createCreateArticleResponseDto, createSaveArticleVersionResponseDto } from '../../mocks/articles';
import { createNewsVersionDto } from '../../mocks/news';
import { ArticleEditPage } from '../../pages/article-edit.page';
import { NewsPage } from '../../pages/news.page';

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
        await news.topicOption('Церковь').click();
        await editor.typeInEditor('Текст новости');
        const create = page.waitForRequest(request => request.url().endsWith('/api/news/create'));
        await editor.clickSave();

        expect((await create).postDataJSON()).toEqual(
            expect.objectContaining({ title: 'Престольный праздник', newsDate: '2025-01-15', topic: 1 }),
        );
        await expect(page).toHaveURL(`/news/${NEWS_ID}`);
    });

    test('a moderator changes the rank of a news item, and only the rank is sent', async ({
        authenticatedPage: page,
    }) => {
        await bypassSsr(page, `**/news/${NEWS_ID}`);
        await mockAuthApi(page, mockUsers.moderator);
        await mockNewsMeta(page, NEWS_ID, {
            articleId: NEWS_ID,
            title: 'Престольный праздник',
            newsDate: '2025-01-15',
            topics: [1],
            rank: 6,
            numlist: 0,
        });
        await page.goto(`/news/${NEWS_ID}`);
        await news.waitForReady();

        await news.metaAction.click();
        await news.rankOption('Событие').click();
        const meta = page.waitForRequest(request => request.url().endsWith(`/api/news/${NEWS_ID}/meta`));
        await news.metaSave.click();

        expect((await meta).postDataJSON()).toEqual({ rank: 6 });
        await expect(news.metaSave).toBeHidden();
    });
});
