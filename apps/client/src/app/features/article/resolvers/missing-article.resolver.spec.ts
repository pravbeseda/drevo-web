import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { resolveMissingArticle } from './missing-article.resolver';
import { ArticleService } from '../../../services/articles';
import { RedirectCommand, Router, UrlSegment } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { of, throwError } from 'rxjs';

describe('resolveMissingArticle', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'findArticleByTitle'>>;
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    function resolve(params: Record<string, string>, segments?: UrlSegment[]) {
        return resolveMissingArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            logger as unknown as Logger,
            createRouteSnapshot(params, segments),
        );
    }

    beforeEach(() => {
        articleService = { findArticleByTitle: jest.fn() };
        router = { parseUrl: jest.fn().mockImplementation((url: string) => ({ url })) };
        logger = { error: jest.fn() };
    });

    it('should decode the title before looking it up', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolve({ title: 'ВИФСАИДА ГАЛИЛЕЙСКАЯ' }).subscribe(() => {
            expect(articleService.findArticleByTitle).toHaveBeenCalledWith('ВИФСАИДА ГАЛИЛЕЙСКАЯ');
            done();
        });
    });

    it('should redirect to the article when it is found', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: true, articleId: 42 }));

        resolve({ title: 'ВИФСАИДА' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.parseUrl).toHaveBeenCalledWith('/articles/42');
            done();
        });
    });

    it('should return a missing article placeholder when not found', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolve({ title: 'НОВАЯ СТАТЬЯ' }).subscribe(result => {
            expect(result).toEqual({
                articleId: 0,
                title: 'НОВАЯ СТАТЬЯ',
                canCreate: true,
                reason: undefined,
            });
            done();
        });
    });

    it('should carry the denial reason', done => {
        articleService.findArticleByTitle.mockReturnValue(
            of({ found: false, canCreate: false, reason: 'Недостаточно прав' }),
        );

        resolve({ title: 'НОВАЯ' }).subscribe(result => {
            expect(result).toEqual({
                articleId: 0,
                title: 'НОВАЯ',
                canCreate: false,
                reason: 'Недостаточно прав',
            });
            done();
        });
    });

    it('should not look up the title a matrix param shadows the segment with', done => {
        // `/articles/find/ВИФСАИДА;title=ГОЛГОФА` — Angular merges the matrix
        // `title` over the segment, so the paramMap names an article the address
        // does not. The empty title resolves to the placeholder instead.
        articleService.findArticleByTitle.mockReturnValue(
            of({ found: false, canCreate: false, reason: 'Пустое название' }),
        );

        resolve({ title: 'ГОЛГОФА' }, [new UrlSegment('ВИФСАИДА', { title: 'ГОЛГОФА' })]).subscribe(result => {
            expect(articleService.findArticleByTitle).toHaveBeenCalledWith('');
            expect(result).toEqual({
                articleId: 0,
                title: '',
                canCreate: false,
                reason: 'Пустое название',
            });
            done();
        });
    });

    it('should resolve to undefined (error state) when the lookup fails', done => {
        // Existence was never established — must not claim the article is missing.
        articleService.findArticleByTitle.mockReturnValue(throwError(() => new Error('Network error')));

        resolve({ title: 'НОВАЯ' }).subscribe(result => {
            expect(result).toBeUndefined();
            expect(logger.error).toHaveBeenCalled();
            done();
        });
    });
});
