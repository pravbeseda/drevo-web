import {
    apiError,
    apiSuccess,
    createPicturePendingDto,
    createPicturesListResponse,
    mockPictureData,
    mockUsers,
} from '../mocks';
import {
    createArticleHistoryResponse,
    createArticlesSearchResponse,
    createModerationResponseDto,
    createSaveArticleVersionResponseDto,
    mockArticleData,
    mockArticleEditData,
    mockArticleViewData,
    mockDiffData,
} from '../mocks/articles';
import {
    ArticleHistoryResponseDto,
    ArticleSearchResponseDto,
    ArticleVersionDto,
    ModerationResponseDto,
    PictureDto,
    PicturesListResponseDto,
    SaveArticleVersionResponseDto,
    User,
    VersionPairsResponseDto,
} from '@drevo-web/shared';
import { Page } from '@playwright/test';

/**
 * Bypass SSR for a specific route pattern by serving a client-only HTML shell.
 * Use this when testing error states on SSR-enabled routes, since page.route()
 * only intercepts browser-level requests (not server-side HTTP calls from SSR).
 */
export async function bypassSsr(page: Page, urlPattern: string): Promise<void> {
    await page.route(urlPattern, async (route, request) => {
        if (request.resourceType() === 'document') {
            const baseUrl = new URL(request.url()).origin;
            const response = await route.fetch({ url: baseUrl });
            await route.fulfill({ response });
        } else {
            await route.fallback();
        }
    });
}

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
export async function mockLoginError(page: Page, status: number, message: string, errorCode?: string): Promise<void> {
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
    await page.route(PICTURES_LIST_RE, route => route.fulfill({ json: apiSuccess(response) }));
}

/** Mock GET /api/pictures — empty list */
export async function mockPicturesEmpty(page: Page): Promise<void> {
    const empty = createPicturesListResponse([]);
    await mockPicturesApi(page, empty);
}

/** Mock GET /api/pictures — server error */
export async function mockPicturesError(page: Page, status = 500): Promise<void> {
    await page.route(PICTURES_LIST_RE, route => route.fulfill({ status, json: apiError('Internal server error') }));
}

/** Mock GET /api/pictures with search — returns filtered subset or custom response */
export async function mockPicturesSearch(page: Page, response: PicturesListResponseDto): Promise<void> {
    await page.unroute(PICTURES_LIST_RE);
    await page.route(PICTURES_LIST_RE, route => route.fulfill({ json: apiSuccess(response) }));
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
export async function mockPictureUpdateTitle(page: Page, id: number, updatedPicture: PictureDto): Promise<void> {
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
    await page.route('**/pictures/thumbs/**', route => route.fulfill({ body: pixel, contentType: 'image/png' }));
    await page.route('**/pictures/full/**', route => route.fulfill({ body: pixel, contentType: 'image/png' }));
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

/** Mock GET /api/articles/search — returns paginated articles list */
export async function mockArticlesApi(
    page: Page,
    response: ArticleSearchResponseDto = createArticlesSearchResponse(mockArticleData.smallList),
): Promise<void> {
    await page.route('**/api/articles/search**', route => route.fulfill({ json: apiSuccess(response) }));
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

/** Mock GET /api/articles/show/:id — single article for the article page */
export async function mockArticleShow(
    page: Page,
    id: number,
    data: ArticleVersionDto = mockArticleViewData.single,
): Promise<void> {
    await page.route(`**/api/articles/show/${id}`, route => route.fulfill({ json: apiSuccess(data) }));
}

/** Mock GET /api/articles/show/:id — 404 not found */
export async function mockArticleShowNotFound(page: Page, id: number): Promise<void> {
    await page.route(`**/api/articles/show/${id}`, route =>
        route.fulfill({ status: 404, json: apiError('Article not found') }),
    );
}

/** Mock GET /api/articles/show/:id — server error */
export async function mockArticleShowError(page: Page, id: number, status = 500): Promise<void> {
    await page.route(`**/api/articles/show/${id}`, route =>
        route.fulfill({ status, json: apiError('Internal server error') }),
    );
}

/** Mock GET /api/articles/version-show/:versionId */
export async function mockArticleVersionShow(
    page: Page,
    versionId: number,
    data: ArticleVersionDto = mockArticleViewData.version,
): Promise<void> {
    await page.route(`**/api/articles/version-show/${versionId}`, route => route.fulfill({ json: apiSuccess(data) }));
}

/** Mock GET /api/articles/history for a specific article */
export async function mockArticleHistory(
    page: Page,
    articleId: number,
    response: ArticleHistoryResponseDto = createArticleHistoryResponse(mockArticleViewData.historyItems),
): Promise<void> {
    await page.route('**/api/articles/history**', route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('articleId') === String(articleId)) {
            return route.fulfill({ json: apiSuccess(response) });
        }
        return route.fallback();
    });
}

/** Mock GET /api/articles/history for a specific article — server error */
export async function mockArticleHistoryError(page: Page, articleId: number, status = 500): Promise<void> {
    await page.route('**/api/articles/history**', route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('articleId') === String(articleId)) {
            return route.fulfill({ status, json: apiError('Internal server error') });
        }
        return route.fallback();
    });
}

// ---------------------------------------------------------------------------
// Article edit
// ---------------------------------------------------------------------------

/** Mock GET /api/articles/version/:versionId — for the edit route resolver */
export async function mockArticleVersion(
    page: Page,
    versionId: number,
    data: ArticleVersionDto = mockArticleEditData.version,
): Promise<void> {
    await page.route(`**/api/articles/version/${versionId}`, route => route.fulfill({ json: apiSuccess(data) }));
}

/** Mock GET /api/articles/version/:versionId — server error */
export async function mockArticleVersionError(page: Page, versionId: number, status = 500): Promise<void> {
    await page.route(`**/api/articles/version/${versionId}`, route =>
        route.fulfill({ status, json: apiError('Internal server error') }),
    );
}

/** Mock POST /api/articles/save — success */
export async function mockArticleSave(
    page: Page,
    response: SaveArticleVersionResponseDto = createSaveArticleVersionResponseDto(),
): Promise<void> {
    await page.route('**/api/articles/save', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: apiSuccess(response) });
    });
}

/** Mock POST /api/articles/save — error */
export async function mockArticleSaveError(page: Page, status: number, message?: string): Promise<void> {
    await page.route('**/api/articles/save', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ status, json: apiError(message ?? 'Internal server error') });
    });
}

/** Mock POST /api/articles/preview — success, returns formatted HTML */
export async function mockArticlePreview(page: Page, html = '<p>Отформатированный текст</p>'): Promise<void> {
    await page.route('**/api/articles/preview', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: apiSuccess({ content: html }) });
    });
}

/** Mock POST /api/articles/preview — error */
export async function mockArticlePreviewError(page: Page, status = 500): Promise<void> {
    await page.route('**/api/articles/preview', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ status, json: apiError('Internal server error') });
    });
}

/** Mock POST /api/articles/moderate — success */
export async function mockArticleModerate(
    page: Page,
    response: ModerationResponseDto = createModerationResponseDto(),
): Promise<void> {
    await page.route('**/api/articles/moderate', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: apiSuccess(response) });
    });
}

/** Mock POST /api/articles/moderate — error */
export async function mockArticleModerateError(page: Page, status = 500): Promise<void> {
    await page.route('**/api/articles/moderate', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ status, json: apiError('Internal server error') });
    });
}

// ---------------------------------------------------------------------------
// Inwork
// ---------------------------------------------------------------------------

/** Mock GET /api/inwork/check — returns optional current editor */
export async function mockInworkCheck(page: Page, editor?: string): Promise<void> {
    await page.route('**/api/inwork/check**', route => route.fulfill({ json: apiSuccess({ editor }) }));
}

/** Mock POST /api/inwork/mark — success (no-op response) */
export async function mockInworkMark(page: Page): Promise<void> {
    await page.route('**/api/inwork/mark', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: apiSuccess(undefined) });
    });
}

/** Mock POST /api/inwork/clear — success (no-op response) */
export async function mockInworkClear(page: Page): Promise<void> {
    await page.route('**/api/inwork/clear', route => {
        if (route.request().method() !== 'POST') return route.fallback();
        return route.fulfill({ json: apiSuccess(undefined) });
    });
}

// ---------------------------------------------------------------------------
// History (global)
// ---------------------------------------------------------------------------

/** Mock GET /api/articles/history — returns all items (no articleId filter) */
export async function mockGlobalHistory(
    page: Page,
    response: ArticleHistoryResponseDto = createArticleHistoryResponse([...mockArticleViewData.historyItems]),
): Promise<void> {
    await page.route('**/api/articles/history**', route => route.fulfill({ json: apiSuccess(response) }));
}

/** Mock GET /api/articles/history — server error */
export async function mockGlobalHistoryError(page: Page, status = 500): Promise<void> {
    await page.route('**/api/articles/history**', route =>
        route.fulfill({ status, json: apiError('Internal server error') }),
    );
}

// ---------------------------------------------------------------------------
// Diff (version pairs)
// ---------------------------------------------------------------------------

/** Mock GET /api/articles/versionpairs?version1=:version1 — returns version pairs */
export async function mockVersionPairs(
    page: Page,
    version1: number,
    response: VersionPairsResponseDto = mockDiffData.default,
): Promise<void> {
    await page.route('**/api/articles/versionpairs**', route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('version1') === String(version1)) {
            return route.fulfill({ json: apiSuccess(response) });
        }
        return route.fallback();
    });
}

/** Mock GET /api/articles/versionpairs — no previous version (404 + NO_PREVIOUS_VERSION) */
export async function mockVersionPairsNoHistory(page: Page, version1: number): Promise<void> {
    await page.route('**/api/articles/versionpairs**', route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('version1') === String(version1)) {
            return route.fulfill({
                status: 404,
                json: apiError('Not found', 'NO_PREVIOUS_VERSION'),
            });
        }
        return route.fallback();
    });
}

/** Mock GET /api/articles/versionpairs — generic server error */
export async function mockVersionPairsServerError(page: Page, version1: number, status = 500): Promise<void> {
    await page.route('**/api/articles/versionpairs**', route => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('version1') === String(version1)) {
            return route.fulfill({ status, json: apiError('Internal server error') });
        }
        return route.fallback();
    });
}
