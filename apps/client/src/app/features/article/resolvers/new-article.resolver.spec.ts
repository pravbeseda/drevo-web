import { resolveNewArticle } from './new-article.resolver';
import { ArticlePageService } from '../services/article-page.service';
import { ArticleService } from '../../../services/articles';
import { ActivatedRouteSnapshot, RedirectCommand, Router, convertToParamMap } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { of, throwError } from 'rxjs';

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

/** The create route is a child of `find/:title`, which owns the param. */
function createChildRouteSnapshot(parentParams: Record<string, string>): ActivatedRouteSnapshot {
    return {
        paramMap: convertToParamMap({}),
        parent: createRouteSnapshot(parentParams),
    } as ActivatedRouteSnapshot;
}

describe('resolveNewArticle', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'findArticleByTitle'>>;
    let router: jest.Mocked<Pick<Router, 'createUrlTree'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;
    let pageService: jest.Mocked<Pick<ArticlePageService, 'setMissing' | 'setError'>>;

    function resolve(params: Record<string, string>) {
        return resolveNewArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            logger as unknown as Logger,
            pageService as unknown as ArticlePageService,
            createRouteSnapshot(params),
        );
    }

    beforeEach(() => {
        articleService = { findArticleByTitle: jest.fn() };
        // createUrlTree encodes segments itself, so the title is passed as a raw
        // segment rather than interpolated into a parsed URL string.
        router = { createUrlTree: jest.fn().mockImplementation((commands: unknown[]) => ({ commands })) };
        logger = { error: jest.fn() };
        pageService = { setMissing: jest.fn(), setError: jest.fn() };
    });

    it('should return a create session when creation is allowed', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolve({ title: 'НОВАЯ СТАТЬЯ' }).subscribe(result => {
            expect(result).toEqual({
                mode: 'create',
                articleId: 0,
                versionId: 0,
                title: 'НОВАЯ СТАТЬЯ',
                content: '',
            });
            done();
        });
    });

    it('should redirect to the article when it already exists', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: true, articleId: 7 }));

        resolve({ title: 'НОВАЯ СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/articles', 7]);
            done();
        });
    });

    it('should redirect back to the placeholder when creation is denied', done => {
        articleService.findArticleByTitle.mockReturnValue(
            of({ found: false, canCreate: false, reason: 'Недостаточно прав' }),
        );

        resolve({ title: 'НОВАЯ СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/articles', 'find', 'НОВАЯ СТАТЬЯ']);
            // Refresh the shared placeholder state, since the same-URL redirect
            // won't re-run the parent resolver — otherwise the button would loop.
            expect(pageService.setMissing).toHaveBeenCalledWith({
                articleId: 0,
                title: 'НОВАЯ СТАТЬЯ',
                canCreate: false,
                reason: 'Недостаточно прав',
            });
            done();
        });
    });

    it('should read the title from the parent route', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolveNewArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            logger as unknown as Logger,
            pageService as unknown as ArticlePageService,
            createChildRouteSnapshot({ title: 'НОВАЯ СТАТЬЯ' }),
        ).subscribe(result => {
            expect(articleService.findArticleByTitle).toHaveBeenCalledWith('НОВАЯ СТАТЬЯ');
            expect(result).toEqual(expect.objectContaining({ mode: 'create', title: 'НОВАЯ СТАТЬЯ' }));
            done();
        });
    });

    it('should redirect back to the placeholder when the lookup fails', done => {
        articleService.findArticleByTitle.mockReturnValue(throwError(() => new Error('Network error')));

        resolve({ title: 'НОВАЯ СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/articles', 'find', 'НОВАЯ СТАТЬЯ']);
            expect(logger.error).toHaveBeenCalled();
            // Surface the failure in the shared placeholder state — the same-URL
            // redirect won't re-run the parent resolver, so without this the
            // button would keep a stale canCreate:true and loop silently.
            expect(pageService.setError).toHaveBeenCalledWith('Ошибка загрузки статьи');
            done();
        });
    });

    it('should pass a title with parens and % as a segment, not URL grammar', done => {
        // Interpolating this into parseUrl would truncate at "(" and throw
        // "URI malformed" on "%". createUrlTree gets it as a raw segment.
        const title = 'СВЯТОЙ (+ 1919) 100% воды';
        articleService.findArticleByTitle.mockReturnValue(
            of({ found: false, canCreate: false, reason: 'Недостаточно прав' }),
        );

        resolve({ title }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/articles', 'find', title]);
            done();
        });
    });
});
