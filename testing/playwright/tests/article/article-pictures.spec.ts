import {
    test,
    expect,
    bypassSsr,
    mockArticleShow,
    mockAuthApi,
    mockPictureArticles,
    mockPictureDetail,
    mockPicturePending,
    mockPictureImages,
} from '../../fixtures';
import { createArticleVersionDto, createPictureContentHtml, createPictureDto } from '../../mocks';
import { ArticlePage } from '../../pages/article.page';
import { LightboxPage } from '../../pages/lightbox.page';
import { PictureDetailPage } from '../../pages/picture-detail.page';

const ARTICLE_ID = 42;
const PICTURE_ID = 5319;

const PICTURE = createPictureDto({
    pic_id: PICTURE_ID,
    pic_title: 'Тестовая иллюстрация',
    pic_user: 'testuser',
});

const ARTICLE = createArticleVersionDto({
    articleId: ARTICLE_ID,
    title: 'Статья с иллюстрацией',
    content: `<p>Текст статьи перед иллюстрацией.</p>${createPictureContentHtml(PICTURE_ID)}`,
});

test.describe('Article pictures', () => {
    let article: ArticlePage;
    let lightbox: LightboxPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        // Picture endpoints are registered on the BrowserContext so they also
        // cover the picture page opened in a new tab via middle-click.
        const context = page.context();
        await bypassSsr(context, `**/pictures/${PICTURE_ID}`);
        await mockAuthApi(context);
        await mockPictureImages(context);
        await mockPictureDetail(context, PICTURE_ID, PICTURE);
        await mockPictureArticles(context, PICTURE_ID, []);
        await mockPicturePending(context, PICTURE_ID);
        // Force pure CSR for the article route so the mocked content (and its
        // `.pic` markup) wins over real data transferred from SSR.
        await bypassSsr(page, `**/articles/${ARTICLE_ID}`);
        await mockArticleShow(page, ARTICLE_ID, ARTICLE);

        article = new ArticlePage(page);
        lightbox = new LightboxPage(page);
        await page.goto(`/articles/${ARTICLE_ID}`);
        await article.waitForReady();
    });

    test('opens the lightbox on picture click without navigating away', async ({ authenticatedPage: page }) => {
        await article.clickPicture();
        await lightbox.waitForReady();

        await expect(lightbox.backdrop).toBeVisible();
        await expect(lightbox.image).toBeVisible();
        await expect(article.content).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}(#|$)`));
    });

    test('closes the lightbox on Escape', async ({ authenticatedPage: page }) => {
        await article.clickPicture();
        await lightbox.waitForReady();

        await page.keyboard.press('Escape');

        await expect(lightbox.backdrop).not.toBeVisible();
        await expect(article.content).toBeVisible();
        await expect(page).not.toHaveURL(/#picture=/);
    });

    test('opens the picture page in a new tab on middle click', async ({ isMobile, browserName }) => {
        test.skip(isMobile, 'Middle-click is not available on mobile devices');
        test.skip(browserName === 'webkit', 'WebKit does not open a new tab on middle-click in Playwright');

        const newPage = await article.openPictureInNewTab();
        const detail = new PictureDetailPage(newPage);
        await detail.waitForReady();

        await expect(newPage).toHaveURL(new RegExp(`/pictures/${PICTURE_ID}$`));
        await expect(detail.image).toBeVisible();
        await expect(detail.title).toHaveText('Тестовая иллюстрация');
    });
});
