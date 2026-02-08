import { ArticlePageService } from './article-page.service';
import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { BehaviorSubject, of, throwError, NEVER } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 123,
    versionId: 456,
    title: 'Test Article',
    content: '<p>Content</p>',
    author: 'Author',
    date: new Date('2024-01-15'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

describe('ArticlePageService', () => {
    let spectator: SpectatorService<ArticlePageService>;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let route: ActivatedRoute;

    const createService = createServiceFactory({
        service: ArticlePageService,
        providers: [
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getArticle: jest.fn() },
            },
        ],
    });

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '123' }));
        route = {
            paramMap: paramMapSubject.asObservable(),
        } as unknown as ActivatedRoute;

        spectator = createService();
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
        articleService.getArticle.mockReturnValue(of(mockArticle));
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should load article on init', () => {
        spectator.service.init(route);

        expect(articleService.getArticle).toHaveBeenCalledWith(123);
        expect(spectator.service.article()).toEqual(mockArticle);
        expect(spectator.service.isLoading()).toBe(false);
        expect(spectator.service.articleId()).toBe(123);
    });

    it('should set loading state during load', () => {
        articleService.getArticle.mockReturnValue(NEVER);

        spectator.service.init(route);

        expect(spectator.service.isLoading()).toBe(true);
    });

    it('should handle invalid ID', () => {
        paramMapSubject.next(convertToParamMap({ id: 'invalid' }));

        spectator.service.init(route);

        expect(spectator.service.error()).toBe('Неверный ID статьи');
        expect(spectator.service.isLoading()).toBe(false);
    });

    it('should handle 404 error', () => {
        const error = new HttpErrorResponse({ status: 404 });
        articleService.getArticle.mockReturnValue(throwError(() => error));

        spectator.service.init(route);

        expect(spectator.service.error()).toBe('Статья не найдена');
    });

    it('should handle generic error', () => {
        const error = new HttpErrorResponse({ status: 500 });
        articleService.getArticle.mockReturnValue(throwError(() => error));

        spectator.service.init(route);

        expect(spectator.service.error()).toBe('Ошибка загрузки статьи');
    });

    it('should reload when route params change', () => {
        spectator.service.init(route);

        const anotherArticle = { ...mockArticle, articleId: 456 };
        articleService.getArticle.mockReturnValue(of(anotherArticle));
        paramMapSubject.next(convertToParamMap({ id: '456' }));

        expect(articleService.getArticle).toHaveBeenCalledWith(456);
        expect(spectator.service.article()).toEqual(anotherArticle);
    });

    it('should compute title from article', () => {
        spectator.service.init(route);

        expect(spectator.service.title()).toBe('Test Article');
    });

    it('should compute editUrl from article', () => {
        spectator.service.init(route);

        expect(spectator.service.editUrl()).toBe('/articles/edit/456');
    });
});
