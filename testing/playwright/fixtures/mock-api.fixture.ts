import { apiError, apiSuccess, mockUsers } from '../mocks';
import { createArticlesSearchResponse, mockArticleData } from '../mocks/articles';
import { createPicturePendingDto, createPicturesListResponse, mockPictureData } from '../mocks/pictures';
import { ArticleSearchResponseDto, PictureDto, PicturesListResponseDto, User } from '@drevo-web/shared';
import { Page } from '@playwright/test';

/** Mock auth endpoints for an authenticated user */
export async function mockAuthApi(page: Page, user: User = mockUsers.authenticated): Promise<void> {
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user }),
        }),
    );

    await page.route('**/api/auth/csrf', route =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );

    await page.route('**/api/auth/logout', route => route.fulfill({ json: apiSuccess(undefined) }));
}

/** Mock auth endpoints for an unauthenticated user */
export async function mockUnauthenticatedApi(page: Page): Promise<void> {
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: false }),
        }),
    );

    await page.route('**/api/auth/csrf', route =>
        route.fulfill({
            json: apiSuccess({ csrfToken: 'test-csrf-token' }),
        }),
    );
}

/** Mock POST /api/auth/login — successful login returning the given user */
export async function mockLoginSuccess(page: Page, user: User = mockUsers.authenticated): Promise<void> {
    await page.route('**/api/auth/login', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user, csrfToken: 'new-csrf-token' }),
        }),
    );

    // Update /api/auth/me to return authenticated state after login
    await page.unroute('**/api/auth/me');
    await page.route('**/api/auth/me', route =>
        route.fulfill({
            json: apiSuccess({ isAuthenticated: true, user }),
        }),
    );
}

/** Mock POST /api/auth/login — failed login with error code */
export async function mockLoginError(
    page: Page,
    status: number,
    message: string,
    errorCode?: string,
): Promise<void> {
    await page.route('**/api/auth/login', route =>
        route.fulfill({
            status,
            json: apiError(message, errorCode),
        }),
    );
}

/** Mock POST /api/auth/logout — server error (logout still clears local state) */
export async function mockLogoutError(page: Page, status = 500): Promise<void> {
    await page.unroute('**/api/auth/logout');
    await page.route('**/api/auth/logout', route =>
        route.fulfill({
            status,
            json: apiError('Internal server error'),
        }),
    );
}

/** Mock a specific endpoint with a server error */
export async function mockApiError(page: Page, pattern: string, status: number, message: string): Promise<void> {
    await page.route(pattern, route =>
        route.fulfill({
            status,
            json: apiError(message),
        }),
    );
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

/** Regex matching GET /api/pictures (with or without query params), but NOT /api/pictures/:id */
const PICTURES_LIST_RE = /\/api\/pictures(\?.*)?$/;

/** Mock GET /api/pictures — paginated list */
export async function mockPicturesApi(
    page: Page,
    response: PicturesListResponseDto = createPicturesListResponse(mockPictureData.fullPage),
): Promise<void> {
    await page.route(PICTURES_LIST_RE, route =>
        route.fulfill({ json: apiSuccess(response) }),
    );
}

/** Mock GET /api/pictures — empty list */
export async function mockPicturesEmpty(page: Page): Promise<void> {
    const empty = createPicturesListResponse([]);
    await mockPicturesApi(page, empty);
}

/** Mock GET /api/pictures — server error */
export async function mockPicturesError(page: Page, status = 500): Promise<void> {
    await page.route(PICTURES_LIST_RE, route =>
        route.fulfill({ status, json: apiError('Internal server error') }),
    );
}

/** Mock GET /api/pictures with search — returns filtered subset or custom response */
export async function mockPicturesSearch(
    page: Page,
    response: PicturesListResponseDto,
): Promise<void> {
    await page.unroute(PICTURES_LIST_RE);
    await page.route(PICTURES_LIST_RE, route =>
        route.fulfill({ json: apiSuccess(response) }),
    );
}

/** Mock GET /api/pictures/:id — single picture detail */
export async function mockPictureDetail(
    page: Page,
    id: number,
    picture: PictureDto = mockPictureData.single,
): Promise<void> {
    await page.route(`**/api/pictures/${id}`, route => {
        const method = route.request().method();
        if (method !== 'GET') return route.fallback();
        return route.fulfill({ json: apiSuccess(picture) });
    });
}

/** Mock GET /api/pictures/:id — 404 */
export async function mockPictureNotFound(page: Page, id: number): Promise<void> {
    await page.route(`**/api/pictures/${id}`, route => {
        const method = route.request().method();
        if (method !== 'GET') return route.fallback();
        return route.fulfill({ status: 404, json: apiError('Picture not found') });
    });
}

/** Mock GET /api/pictures/:id — server error */
export async function mockPictureDetailError(page: Page, id: number, status = 500): Promise<void> {
    await page.route(`**/api/pictures/${id}`, route => {
        const method = route.request().method();
        if (method !== 'GET') return route.fallback();
        return route.fulfill({ status, json: apiError('Internal server error') });
    });
}

/** Mock GET /api/pictures/:id/articles */
export async function mockPictureArticles(
    page: Page,
    pictureId: number,
    articles = mockPictureData.articles,
): Promise<void> {
    await page.route(`**/api/pictures/${pictureId}/articles`, route =>
        route.fulfill({ json: apiSuccess({ items: articles }) }),
    );
}

/** Mock PATCH /api/pictures/:id — title update (direct edit, moderator response) */
export async function mockPictureUpdateTitle(
    page: Page,
    id: number,
    updatedPicture: PictureDto,
): Promise<void> {
    await page.route(`**/api/pictures/${id}`, route => {
        const method = route.request().method();
        if (method !== 'PATCH') return route.fallback();
        return route.fulfill({ json: apiSuccess(updatedPicture) });
    });
}

/** Mock PATCH /api/pictures/:id — title update returns pending (regular user) */
export async function mockPictureUpdateTitlePending(page: Page, id: number): Promise<void> {
    await page.route(`**/api/pictures/${id}`, route => {
        const method = route.request().method();
        if (method !== 'PATCH') return route.fallback();
        const pending = createPicturePendingDto({ pp_pic_id: id, pp_title: 'New title', pic_title: 'Old title' });
        return route.fulfill({ json: apiSuccess(pending) });
    });
}

/** Mock /pictures/thumbs/** — return a 1x1 transparent PNG placeholder */
export async function mockPictureThumbs(page: Page): Promise<void> {
    // 1x1 transparent PNG
    const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==',
        'base64',
    );
    await page.route('**/pictures/thumbs/**', route =>
        route.fulfill({ body: pixel, contentType: 'image/png' }),
    );
    await page.route('**/pictures/full/**', route =>
        route.fulfill({ body: pixel, contentType: 'image/png' }),
    );
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

/** Mock GET /api/articles/search — returns paginated articles list */
export async function mockArticlesApi(
    page: Page,
    response: ArticleSearchResponseDto = createArticlesSearchResponse(mockArticleData.smallList),
): Promise<void> {
    await page.route('**/api/articles/search**', route =>
        route.fulfill({ json: apiSuccess(response) }),
    );
}

/** Mock GET /api/articles/search — empty list */
export async function mockArticlesEmpty(page: Page): Promise<void> {
    await mockArticlesApi(page, createArticlesSearchResponse([]));
}

/** Mock GET /api/articles/search — server error */
export async function mockArticlesError(page: Page, status = 500): Promise<void> {
    await page.route('**/api/articles/search**', route =>
        route.fulfill({ status, json: apiError('Internal server error') }),
    );
}
