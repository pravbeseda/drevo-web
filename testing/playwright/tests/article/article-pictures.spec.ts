import { test, expect, bypassSsr, mockArticleShow, mockPictureDetail, mockPictureImages } from '../../fixtures';
import { createArticleVersionDto, createPictureContentHtml, createPictureDto } from '../../mocks';
import { ArticlePage } from '../../pages/article.page';
import { LightboxPage } from '../../pages/lightbox.page';

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
        await mockPictureImages(page);
        await mockPictureDetail(page, PICTURE_ID, PICTURE);
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

        await expect(lightbox.backdrop).toBeHidden();
        await expect(article.content).toBeVisible();
        await expect(page).not.toHaveURL(/#picture=/);
    });

    test('leaves middle click to the browser instead of opening the lightbox', async ({
        authenticatedPage: page,
        isMobile,
    }) => {
        test.skip(isMobile, 'Middle-click is not available on mobile devices');

        const defaultPrevented = await article.middleClickPicture();

        expect(defaultPrevented).toBe(false);
        await expect(article.pictureLink).toHaveAttribute('href', `/pictures/${PICTURE_ID}`);
        await expect(lightbox.backdrop).toBeHidden();
        await expect(page).toHaveURL(new RegExp(`/articles/${ARTICLE_ID}(#|$)`));
    });
});
