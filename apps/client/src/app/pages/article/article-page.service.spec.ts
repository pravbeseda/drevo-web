import { ArticlePageService } from './article-page.service';
import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
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
    let service: ArticlePageService;
    let articleService: jest.Mocked<ArticleService>;
    let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let route: ActivatedRoute;

    beforeEach(() => {
        paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '123' }));

        TestBed.configureTestingModule({
            providers: [
                ArticlePageService,
                mockLoggerProvider(),
                {
                    provide: ArticleService,
                    useValue: { getArticle: jest.fn() },
                },
            ],
        });

        route = {
            paramMap: paramMapSubject.asObservable(),
        } as unknown as ActivatedRoute;

        articleService = TestBed.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
        articleService.getArticle.mockReturnValue(of(mockArticle));
        service = TestBed.inject(ArticlePageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load article on init', () => {
        service.init(route);

        expect(articleService.getArticle).toHaveBeenCalledWith(123);
        expect(service.article()).toEqual(mockArticle);
        expect(service.isLoading()).toBe(false);
        expect(service.articleId()).toBe(123);
    });

    it('should set loading state during load', () => {
        articleService.getArticle.mockReturnValue(NEVER);

        service.init(route);

        expect(service.isLoading()).toBe(true);
    });

    it('should handle invalid ID', () => {
        paramMapSubject.next(convertToParamMap({ id: 'invalid' }));

        service.init(route);

        expect(service.error()).toBe('Неверный ID статьи');
        expect(service.isLoading()).toBe(false);
    });

    it('should handle 404 error', () => {
        const error = new HttpErrorResponse({ status: 404 });
        articleService.getArticle.mockReturnValue(throwError(() => error));

        service.init(route);

        expect(service.error()).toBe('Статья не найдена');
    });

    it('should handle generic error', () => {
        const error = new HttpErrorResponse({ status: 500 });
        articleService.getArticle.mockReturnValue(throwError(() => error));

        service.init(route);

        expect(service.error()).toBe('Ошибка загрузки статьи');
    });

    it('should reload when route params change', () => {
        service.init(route);

        const anotherArticle = { ...mockArticle, articleId: 456 };
        articleService.getArticle.mockReturnValue(of(anotherArticle));
        paramMapSubject.next(convertToParamMap({ id: '456' }));

        expect(articleService.getArticle).toHaveBeenCalledWith(456);
        expect(service.article()).toEqual(anotherArticle);
    });

    it('should compute title from article', () => {
        service.init(route);

        expect(service.title()).toBe('Test Article');
    });

    it('should compute editUrl from article', () => {
        service.init(route);

        expect(service.editUrl()).toBe('/articles/edit/456');
    });
});
