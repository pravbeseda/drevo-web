import { ArticleService } from '../../../services/articles';
import { PageContext } from '../../services/page-context/page-context';
import { createRouteSnapshot } from '../../testing/route-testing.helper';
import { createReviewBlockStubs } from '../review-block/review-block.testing';
import { PageVersionTabComponent } from './page-version-tab.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, provideRouter, Router, UrlSegment } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ArticleVersion, Review, ReviewStatus } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { BehaviorSubject, of, throwError, NEVER } from 'rxjs';

const mockVersion: ArticleVersion = {
    articleId: 100,
    versionId: 789,
    title: 'Versioned Article',
    content: '<p>Version content</p>',
    author: 'Version Author',
    date: new Date('2024-03-20T12:00:00Z'),
    redirect: false,
    new: false,
    approved: 0,
    info: 'Updated intro',
    comment: '',
    topics: [],
};

/**
 * The tab reads its id off `route.snapshot` and re-reads it on every `route.url`
 * emission, so a stub has to carry both, built from the same segments.
 */
function routeStub(
    params: Record<string, string>,
    segments: UrlSegment[] = Object.values(params).map(value => new UrlSegment(value, {})),
) {
    return { url: of(segments), snapshot: createRouteSnapshot(params, segments) };
}

describe('PageVersionTabComponent', () => {
    let spectator: Spectator<PageVersionTabComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let urlSubject: BehaviorSubject<UrlSegment[]>;
    let routeMock: { url: unknown; snapshot: ReturnType<typeof createRouteSnapshot> };

    const reviewBlockStubs = createReviewBlockStubs();

    const createComponent = createComponentFactory({
        component: PageVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: PageContext,
                useValue: { kind: 'articles', articleId: signal(100) },
            },
            ...reviewBlockStubs.providers,
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        reviewBlockStubs.user$.next(undefined);
        reviewBlockStubs.getReviews.mockReturnValue(of<readonly Review[]>([]));
        urlSubject = new BehaviorSubject([new UrlSegment('version', {}), new UrlSegment('789', {})]);
        routeMock = {
            url: urlSubject.asObservable(),
            snapshot: createRouteSnapshot({ versionId: '789' }),
        };
        spectator = createComponent({
            providers: [{ provide: ActivatedRoute, useValue: routeMock }],
        });
        articleService = spectator.inject(ArticleService);
        articleService.getVersionShow.mockReturnValue(of(mockVersion));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should load version on init', () => {
        spectator.detectChanges();

        expect(articleService.getVersionShow).toHaveBeenCalledWith(789, 'articles');
        expect(spectator.component.version()).toEqual(mockVersion);
    });

    it('should show version banner', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="version-banner"]')).toBeTruthy();
    });

    it('should render the review block when reviews exist', () => {
        reviewBlockStubs.getReviews.mockReturnValue(
            of<readonly Review[]>([
                { reviewer: 'Some Reviewer', status: ReviewStatus.Suggest, comment: 'Fix', updatedAt: new Date() },
            ]),
        );
        reviewBlockStubs.user$.next(createMockUser({ isReviewer: false }));
        spectator.detectChanges();

        expect(spectator.query('[data-testid="review-block"]')).toBeTruthy();
        expect(reviewBlockStubs.getReviews).toHaveBeenCalledWith('article', 789);
    });

    it('should display author and info in banner', () => {
        spectator.detectChanges();

        const banner = spectator.query('[data-testid="version-banner"]');
        expect(banner?.textContent).toContain('Version Author');
        expect(banner?.textContent).toContain('Updated intro');
    });

    it('should show link to current article version', () => {
        spectator.detectChanges();

        const link = spectator.query('[data-testid="version-banner"] a') as HTMLAnchorElement;
        expect(link).toBeTruthy();
        expect(link.textContent).toContain('Перейти к текущей версии статьи');
        expect(link.getAttribute('href')).toBe('/articles/100');
    });

    it('should show spinner while loading', () => {
        articleService.getVersionShow.mockReturnValue(NEVER);
        spectator.detectChanges();

        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show 404 error', () => {
        const error = new HttpErrorResponse({ status: 404 });
        articleService.getVersionShow.mockReturnValue(throwError(() => error));
        spectator.detectChanges();

        expect(spectator.component.error()).toBe('Версия не найдена');
    });

    it('should show generic error', () => {
        const error = new HttpErrorResponse({ status: 500 });
        articleService.getVersionShow.mockReturnValue(throwError(() => error));
        spectator.detectChanges();

        expect(spectator.component.error()).toBe('Ошибка загрузки версии');
    });
    it('rejects a matrix address reached by an in-app navigation', () => {
        // `/articles/100/version/456;versionId=789` — the matrix value wins over
        // the positional one, so the merged params are unchanged and paramMap
        // never emits. Only the url does, and the tab must notice.
        spectator.detectChanges();
        expect(articleService.getVersionShow).toHaveBeenCalledWith(789, 'articles');
        const shadowed = [new UrlSegment('version', {}), new UrlSegment('456', { versionId: '789' })];

        routeMock.snapshot = createRouteSnapshot({ versionId: '789' }, shadowed);
        urlSubject.next(shadowed);
        spectator.detectChanges();

        expect(spectator.component.error()).toBe('Неверный ID версии');
        expect(spectator.component.version()).toBeUndefined();
        expect(articleService.getVersionShow).toHaveBeenCalledTimes(1);
    });
});

describe('PageVersionTabComponent with mismatched article', () => {
    let spectator: Spectator<PageVersionTabComponent>;
    let router: Router;

    const mismatchedVersion: ArticleVersion = {
        ...mockVersion,
        articleId: 200,
    };

    const createComponent = createComponentFactory({
        component: PageVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: {
                    getVersionShow: jest.fn().mockReturnValue(of(mismatchedVersion)),
                },
            },
            {
                provide: PageContext,
                useValue: { kind: 'articles', articleId: signal(100) },
            },
            {
                provide: ActivatedRoute,
                useValue: routeStub({ versionId: '789' }),
            },
        ],
        detectChanges: false,
    });

    it('should redirect to correct article URL when version belongs to different article', () => {
        spectator = createComponent();
        router = spectator.inject(Router);
        jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        spectator.detectChanges();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/200/version/789', { replaceUrl: true });
        expect(spectator.component.version()).toBeUndefined();
    });
});

describe('PageVersionTabComponent with invalid ID', () => {
    const createComponent = createComponentFactory({
        component: PageVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: PageContext,
                useValue: { kind: 'articles', articleId: signal(100) },
            },
            {
                provide: ActivatedRoute,
                useValue: routeStub({ versionId: 'invalid' }),
            },
        ],
    });

    it('should show error for invalid version ID', () => {
        const spectator = createComponent();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});

describe('PageVersionTabComponent with a malformed ID', () => {
    const createComponent = createComponentFactory({
        component: PageVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: PageContext,
                useValue: { kind: 'articles', articleId: signal(100) },
            },
        ],
    });

    it.each([
        // parseInt() read a prefix and dropped the rest, so the first two once
        // loaded version 42 under an address the route never names. The hex form
        // was already rejected here, by parseInt('0x2a', 10) answering 0.
        ['trailing garbage', '42abc'],
        ['padded with a leading zero', '042'],
        ['hexadecimal', '0x2a'],
    ])('shows the error for a version ID %s, without asking the API', (_case, versionId) => {
        const articleService = { getVersionShow: jest.fn() };
        const spectator = createComponent({
            providers: [
                { provide: ArticleService, useValue: articleService },
                {
                    provide: ActivatedRoute,
                    useValue: routeStub({ versionId }),
                },
            ],
        });

        expect(spectator.component.error()).toBe('Неверный ID версии');
        expect(articleService.getVersionShow).not.toHaveBeenCalled();
    });

    it('shows the error when a segment carries matrix params, without asking the API', () => {
        // Angular merges `;versionId=789` over the positional `1`, so the
        // paramMap reads 789 under an address the route pattern never named.
        const articleService = { getVersionShow: jest.fn() };
        const spectator = createComponent({
            providers: [
                { provide: ArticleService, useValue: articleService },
                {
                    provide: ActivatedRoute,
                    useValue: routeStub({ versionId: '789' }, [new UrlSegment('1', { versionId: '789' })]),
                },
            ],
        });

        expect(spectator.component.error()).toBe('Неверный ID версии');
        expect(articleService.getVersionShow).not.toHaveBeenCalled();
    });
});

describe('PageVersionTabComponent on a news item', () => {
    const reviewBlockStubs = createReviewBlockStubs();
    const articleService = { getVersionShow: jest.fn() };

    const createComponent = createComponentFactory({
        component: PageVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            { provide: ArticleService, useValue: articleService },
            { provide: PageContext, useValue: { kind: 'news', articleId: signal(100) } },
            { provide: ActivatedRoute, useValue: routeStub({ versionId: '789' }) },
            ...reviewBlockStubs.providers,
        ],
    });

    let spectator: Spectator<PageVersionTabComponent>;

    beforeEach(() => {
        jest.clearAllMocks();
        reviewBlockStubs.user$.next(createMockUser({ isReviewer: false }));
        reviewBlockStubs.getReviews.mockReturnValue(of<readonly Review[]>([]));
        articleService.getVersionShow.mockReturnValue(of(mockVersion));
        spectator = createComponent();
    });

    it('reads the version through the news endpoints', () => {
        expect(articleService.getVersionShow).toHaveBeenCalledWith(789, 'news');
    });

    it('names the version as one of a news item and links back to the news item', () => {
        const banner = spectator.query('[data-testid="version-banner"]');
        const link = spectator.query<HTMLAnchorElement>('[data-testid="version-banner"] a');

        expect(banner?.textContent).toContain('Версия новости от');
        expect(link?.textContent).toContain('Перейти к текущей версии новости');
        expect(link?.getAttribute('href')).toBe('/news/100');
    });

    it('reads the reviews of the news version', () => {
        expect(reviewBlockStubs.getReviews).toHaveBeenCalledWith('news', 789);
    });

    it('offers no article actions: editing and moderating news come with the news editor', () => {
        expect(spectator.query('app-article-sidebar-actions')).toBeNull();
    });
});
