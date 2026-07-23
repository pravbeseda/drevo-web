import { resolveMissingArticle } from './missing-article.resolver';
import { ArticleService } from '../../../services/articles';
import { ActivatedRouteSnapshot, RedirectCommand, Router, convertToParamMap } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { of, throwError } from 'rxjs';

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('resolveMissingArticle', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'findArticleByTitle'>>;
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    function resolve(params: Record<string, string>) {
        return resolveMissingArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            logger as unknown as Logger,
            createRouteSnapshot(params),
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

    it('should deny creation when the lookup fails', done => {
        articleService.findArticleByTitle.mockReturnValue(throwError(() => new Error('Network error')));

        resolve({ title: 'НОВАЯ' }).subscribe(result => {
            expect(result).toEqual({
                articleId: 0,
                title: 'НОВАЯ',
                canCreate: false,
                reason: 'Не удалось проверить права на создание статьи',
            });
            expect(logger.error).toHaveBeenCalled();
            done();
        });
    });
});
