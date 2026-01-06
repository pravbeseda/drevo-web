import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError, NEVER, BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ArticleComponent } from './article.component';
import { ArticleService } from '../../services/articles';
import { Article } from '@drevo-web/shared';

describe('ArticleComponent', () => {
    let spectator: Spectator<ArticleComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const mockArticle: Article = {
        articleId: 123,
        versionId: 456,
        title: 'Test Article Title',
        content: '<p>Test article content</p>',
        author: 'Test Author',
        date: new Date('2024-01-15T10:00:00Z'),
        redirect: false,
    };

    const createComponent = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService, Router],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: paramMapSubject.asObservable(),
                }),
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '123' }));
        spectator = createComponent();
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
        articleService.getArticle.mockReturnValue(of(mockArticle));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('successful article loading', () => {
        it('should display spinner while loading', () => {
            // Use NEVER to keep observable pending (loading state)
            articleService.getArticle.mockReturnValue(NEVER);
            spectator.detectChanges();

            expect(spectator.component.isLoading()).toBe(true);
            expect(spectator.query('ui-spinner')).toBeTruthy();
            expect(spectator.query('.article')).toBeFalsy();
        });

        it('should load and display article', () => {
            spectator.detectChanges();

            expect(articleService.getArticle).toHaveBeenCalledWith(123);
            expect(spectator.component.article()).toEqual(mockArticle);
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.article-title')).toHaveText(
                'Test Article Title'
            );
        });

        it('should render article content as HTML', () => {
            spectator.detectChanges();

            const contentEl = spectator.query('.article-content');
            expect(contentEl?.innerHTML).toContain(
                '<p>Test article content</p>'
            );
        });

        it('should reload article when route param changes', () => {
            spectator.detectChanges();

            expect(articleService.getArticle).toHaveBeenCalledWith(123);

            const anotherArticle: Article = {
                ...mockArticle,
                articleId: 456,
                title: 'Another Article',
            };
            articleService.getArticle.mockReturnValue(of(anotherArticle));

            paramMapSubject.next(convertToParamMap({ id: '456' }));

            expect(articleService.getArticle).toHaveBeenCalledWith(456);
            expect(spectator.component.article()).toEqual(anotherArticle);
        });

        it('should retry loading after error when navigating to same or different article', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки статьи');

            // Now the server recovers
            articleService.getArticle.mockReturnValue(of(mockArticle));

            // Navigate to another article
            paramMapSubject.next(convertToParamMap({ id: '456' }));

            expect(articleService.getArticle).toHaveBeenCalledWith(456);
            expect(spectator.component.article()).toEqual(mockArticle);
            expect(spectator.component.error()).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should display error message when article not found (404)', () => {
            const error = new HttpErrorResponse({
                status: 404,
                statusText: 'Not Found',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Статья не найдена');
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.query('.error-message')).toHaveText(
                'Статья не найдена'
            );
        });

        it('should display generic error message for other errors', () => {
            const error = new HttpErrorResponse({
                status: 500,
                statusText: 'Server Error',
            });
            articleService.getArticle.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            expect(spectator.component.error()).toBe('Ошибка загрузки статьи');
        });
    });
});

describe('ArticleComponent with invalid ID', () => {
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const createComponentWithInvalidId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService, Router],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: 'invalid' })),
                }),
            },
        ],
    });

    it('should show error for non-numeric ID', () => {
        const spectator = createComponentWithInvalidId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
        expect(spectator.component.isLoading()).toBe(false);
    });
});

describe('ArticleComponent with negative ID', () => {
    const createComponentWithNegativeId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService, Router],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '-5' })),
                }),
            },
        ],
    });

    it('should show error for negative ID', () => {
        const spectator = createComponentWithNegativeId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
    });
});

describe('ArticleComponent with zero ID', () => {
    const createComponentWithZeroId = createComponentFactory({
        component: ArticleComponent,
        mocks: [ArticleService, Router],
        providers: [
            {
                provide: ActivatedRoute,
                useFactory: () => ({
                    paramMap: of(convertToParamMap({ id: '0' })),
                }),
            },
        ],
    });

    it('should show error for zero ID', () => {
        const spectator = createComponentWithZeroId();

        expect(spectator.component.error()).toBe('Неверный ID статьи');
    });
});
