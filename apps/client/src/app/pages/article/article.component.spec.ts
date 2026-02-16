import { ArticlePageService } from './article-page.service';
import { ArticleComponent } from './article.component';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
import { BehaviorSubject } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 123,
    versionId: 456,
    title: 'Test Article Title',
    content: '<p>Test article content</p>',
    author: 'Test Author',
    date: new Date('2024-01-15T10:00:00Z'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

function createMockPageService(
    overrides: Partial<{
        article: ArticleVersion | undefined;
        isLoading: boolean;
        error: string | undefined;
        articleId: number | undefined;
        title: string | undefined;
        editUrl: string | undefined;
    }> = {}
) {
    return {
        article: signal('article' in overrides ? overrides.article : mockArticle),
        isLoading: signal(overrides.isLoading ?? false),
        error: signal(overrides.error),
        articleId: signal('articleId' in overrides ? overrides.articleId : 123),
        title: signal('title' in overrides ? overrides.title : 'Test Article Title'),
        editUrl: signal('editUrl' in overrides ? overrides.editUrl : '/articles/edit/456'),
        setArticle: jest.fn(),
        setError: jest.fn(),
    };
}

describe('ArticleComponent', () => {
    let spectator: Spectator<ArticleComponent>;
    let mockService: ReturnType<typeof createMockPageService>;
    let dataSubject: BehaviorSubject<Record<string, unknown>>;

    const createComponent = createComponentFactory({
        component: ArticleComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: createMockPageService(),
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        dataSubject = new BehaviorSubject<Record<string, unknown>>({ article: mockArticle });
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        data: dataSubject.asObservable(),
                        snapshot: { data: {} },
                    },
                },
            ],
        });
        mockService = spectator.inject(ArticlePageService) as unknown as ReturnType<typeof createMockPageService>;
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should call setArticle when route data has article', () => {
        spectator.detectChanges();
        expect(mockService.setArticle).toHaveBeenCalledWith(mockArticle);
    });

    it('should call setError when route data has no article', () => {
        dataSubject.next({ article: undefined });
        spectator.detectChanges();

        expect(mockService.setError).toHaveBeenCalledWith('Ошибка загрузки статьи');
    });

    it('should call setArticle again when route data changes', () => {
        spectator.detectChanges();

        const newArticle = { ...mockArticle, articleId: 999, title: 'New Article' };
        dataSubject.next({ article: newArticle });

        expect(mockService.setArticle).toHaveBeenCalledWith(newArticle);
    });

    it('should display article title when loaded', () => {
        spectator.detectChanges();

        expect(spectator.query('.article-title')).toHaveText('Test Article Title');
    });

    it('should render tabs-group', () => {
        spectator.detectChanges();

        expect(spectator.query('ui-tabs-group')).toBeTruthy();
    });

    it('should render router-outlet', () => {
        spectator.detectChanges();

        expect(spectator.query('router-outlet')).toBeTruthy();
    });

    it('should compute tab groups with correct routes', () => {
        spectator.detectChanges();

        const groups = spectator.component.tabGroups();
        expect(groups).toHaveLength(2);
        expect(groups[0].items).toHaveLength(3);
        expect(groups[0].items[0].route).toBe('/articles/123');
        expect(groups[0].items[0].label).toBe('Статья');
        expect(groups[0].items[0].isActive).toBeTruthy();
        expect(groups[0].items[1].route).toBe('/articles/123/news');
        expect(groups[0].items[2].route).toBe('/articles/123/forum');
        expect(groups[1].items[0].route).toBe('/articles/123/history');
        expect(groups[1].items[1].route).toBe('/articles/123/linkedhere');
        expect(groups[1].align).toBe('end');
    });

    it('should mark article tab active on article URL', async () => {
        const router = spectator.inject(Router);
        await router.navigateByUrl('/articles/123');
        spectator.detectChanges();

        const isActive = spectator.component.tabGroups()[0].items[0].isActive;
        expect(isActive?.()).toBe(true);
    });

    it('should mark article tab active on version URL', async () => {
        const router = spectator.inject(Router);
        await router.navigateByUrl('/articles/123/version/456');
        spectator.detectChanges();

        const isActive = spectator.component.tabGroups()[0].items[0].isActive;
        expect(isActive?.()).toBe(true);
    });

    it('should mark article tab inactive on other sub-page', async () => {
        const router = spectator.inject(Router);
        await router.navigateByUrl('/articles/123/news');
        spectator.detectChanges();

        const isActive = spectator.component.tabGroups()[0].items[0].isActive;
        expect(isActive?.()).toBe(false);
    });
});

describe('ArticleComponent loading state', () => {
    const createComponent = createComponentFactory({
        component: ArticleComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: createMockPageService({
                    isLoading: true,
                    article: undefined,
                }),
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    data: new BehaviorSubject({ article: undefined }),
                    snapshot: { data: {} },
                },
            },
        ],
    });

    it('should display spinner while loading', () => {
        const spectator = createComponent();

        expect(spectator.query('ui-spinner')).toBeTruthy();
        expect(spectator.query('.article')).toBeFalsy();
    });
});

describe('ArticleComponent error state', () => {
    const createComponent = createComponentFactory({
        component: ArticleComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: createMockPageService({
                    error: 'Статья не найдена',
                    article: undefined,
                }),
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    data: new BehaviorSubject({ article: undefined }),
                    snapshot: { data: {} },
                },
            },
        ],
    });

    it('should display error when error is set', () => {
        const spectator = createComponent();

        expect(spectator.query('app-error')).toBeTruthy();
    });
});

describe('ArticleComponent no article ID', () => {
    const createComponent = createComponentFactory({
        component: ArticleComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: createMockPageService({
                    articleId: undefined,
                    article: undefined,
                }),
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    data: new BehaviorSubject({ article: undefined }),
                    snapshot: { data: {} },
                },
            },
        ],
    });

    it('should return empty tab groups when no article ID', () => {
        const spectator = createComponent();

        expect(spectator.component.tabGroups()).toEqual([]);
    });
});
