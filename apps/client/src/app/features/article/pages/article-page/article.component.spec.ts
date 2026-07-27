import { ArticlePageService } from '../../services/article-page.service';
import { ArticleComponent } from './article.component';
import { createMockArticle } from '../../testing/article-testing.helper';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
import { BehaviorSubject } from 'rxjs';

const mockArticle = createMockArticle({ title: 'Test Article Title' });

function createMockPageService(
    overrides: Partial<{
        article: ArticleVersion | undefined;
        error: string | undefined;
        articleId: number | undefined;
        title: string | undefined;
        editUrl: string | undefined;
        isMissing: boolean;
        basePath: string | undefined;
    }> = {},
) {
    const articleId = 'articleId' in overrides ? overrides.articleId : 123;
    const defaultBasePath = articleId ? `/articles/${articleId}` : undefined;
    return {
        article: signal('article' in overrides ? overrides.article : mockArticle),
        error: signal(overrides.error),
        articleId: signal(articleId),
        title: signal('title' in overrides ? overrides.title : 'Test Article Title'),
        editUrl: signal('editUrl' in overrides ? overrides.editUrl : '/articles/123/version/456/edit'),
        isMissing: signal(overrides.isMissing ?? false),
        basePath: signal('basePath' in overrides ? overrides.basePath : defaultBasePath),
        setArticle: jest.fn(),
        setMissing: jest.fn(),
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

describe('ArticleComponent missing article', () => {
    const missingArticle = { articleId: 0, title: 'НОВАЯ СТАТЬЯ', canCreate: true } as const;
    const missingPageService = createMockPageService({
        article: undefined,
        articleId: undefined,
        title: 'НОВАЯ СТАТЬЯ',
        isMissing: true,
        basePath: '/articles/find/НОВАЯ СТАТЬЯ',
    });

    const createComponent = createComponentFactory({
        component: ArticleComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            { provide: ArticlePageService, useValue: missingPageService },
            {
                provide: ActivatedRoute,
                useValue: {
                    data: new BehaviorSubject({ article: missingArticle }),
                    snapshot: { data: {} },
                },
            },
        ],
    });

    it('should call setMissing for a missing article', () => {
        createComponent();

        expect(missingPageService.setMissing).toHaveBeenCalledWith(missingArticle);
        expect(missingPageService.setArticle).not.toHaveBeenCalled();
    });

    it('should render the page instead of an empty body', () => {
        const spectator = createComponent();

        expect(spectator.query('[data-testid="article-page"]')).toBeTruthy();
    });

    it('should hide the versions tab', () => {
        const spectator = createComponent();

        const tabs = spectator.component.tabGroups().flatMap(group => group.items);
        expect(tabs.some(tab => tab.testId === 'tab-history')).toBe(false);
    });

    it('should point the remaining tabs at the find route', () => {
        const spectator = createComponent();

        const groups = spectator.component.tabGroups();
        expect(groups[0].items.map(item => item.route)).toEqual([
            '/articles/find/НОВАЯ СТАТЬЯ',
            '/articles/find/НОВАЯ СТАТЬЯ/news',
            '/articles/find/НОВАЯ СТАТЬЯ/forum',
        ]);
        expect(groups[1].items[0].route).toBe('/articles/find/НОВАЯ СТАТЬЯ/linkedhere');
    });

    it('should mark the article tab active on the find URL', async () => {
        const spectator = createComponent();
        const router = spectator.inject(Router);
        await router.navigateByUrl('/articles/find/НОВАЯ СТАТЬЯ');
        spectator.detectChanges();

        const isActive = spectator.component.tabGroups()[0].items[0].isActive;
        expect(isActive?.()).toBe(true);
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
