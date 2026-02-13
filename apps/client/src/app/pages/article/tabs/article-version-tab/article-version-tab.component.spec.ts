import { ArticleService } from '../../../../services/articles';
import { ArticlePageService } from '../../article-page.service';
import { ArticleVersionTabComponent } from './article-version-tab.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ArticleVersion } from '@drevo-web/shared';
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
};

describe('ArticleVersionTabComponent', () => {
    let spectator: Spectator<ArticleVersionTabComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const createComponent = createComponentFactory({
        component: ArticleVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: ArticlePageService,
                useValue: {
                    articleId: signal(100),
                    editUrl: signal(undefined),
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ versionId: '789' }));
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: paramMapSubject.asObservable(),
                    },
                },
            ],
        });
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        articleService.getVersionShow.mockReturnValue(of(mockVersion));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should load version on init', () => {
        spectator.detectChanges();

        expect(articleService.getVersionShow).toHaveBeenCalledWith(789);
        expect(spectator.component.version()).toEqual(mockVersion);
    });

    it('should show version banner', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="version-banner"]')).toBeTruthy();
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
        expect(link.textContent).toContain('Перейти к текущей версии');
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
});

describe('ArticleVersionTabComponent with mismatched article', () => {
    let spectator: Spectator<ArticleVersionTabComponent>;
    let router: Router;

    const mismatchedVersion: ArticleVersion = {
        ...mockVersion,
        articleId: 200,
    };

    const createComponent = createComponentFactory({
        component: ArticleVersionTabComponent,
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
                provide: ArticlePageService,
                useValue: {
                    articleId: signal(100),
                    editUrl: signal(undefined),
                },
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    paramMap: of(convertToParamMap({ versionId: '789' })),
                },
            },
        ],
        detectChanges: false,
    });

    it('should redirect to correct article URL when version belongs to different article', () => {
        spectator = createComponent();
        router = spectator.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
        spectator.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['/articles', 200, 'version', 789], { replaceUrl: true });
        expect(spectator.component.version()).toBeUndefined();
    });
});

describe('ArticleVersionTabComponent with invalid ID', () => {
    const createComponent = createComponentFactory({
        component: ArticleVersionTabComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: ArticlePageService,
                useValue: {
                    articleId: signal(100),
                    editUrl: signal(undefined),
                },
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    paramMap: of(convertToParamMap({ versionId: 'invalid' })),
                },
            },
        ],
    });

    it('should show error for invalid version ID', () => {
        const spectator = createComponent();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});
