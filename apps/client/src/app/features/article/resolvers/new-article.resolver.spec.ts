import { resolveNewArticle } from './new-article.resolver';
import { ArticleService } from '../../../services/articles';
import { ActivatedRouteSnapshot, RedirectCommand, Router, convertToParamMap } from '@angular/router';
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
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;

    function resolve(params: Record<string, string>) {
        return resolveNewArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            createRouteSnapshot(params),
        );
    }

    beforeEach(() => {
        articleService = { findArticleByTitle: jest.fn() };
        router = { parseUrl: jest.fn().mockImplementation((url: string) => ({ url })) };
    });

    it('should return a create session when creation is allowed', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolve({ title: 'НОВАЯ+СТАТЬЯ' }).subscribe(result => {
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

        resolve({ title: 'НОВАЯ+СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.parseUrl).toHaveBeenCalledWith('/articles/7');
            done();
        });
    });

    it('should redirect back to the placeholder when creation is denied', done => {
        articleService.findArticleByTitle.mockReturnValue(
            of({ found: false, canCreate: false, reason: 'Недостаточно прав' }),
        );

        resolve({ title: 'НОВАЯ+СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.parseUrl).toHaveBeenCalledWith('/articles/find/НОВАЯ+СТАТЬЯ');
            done();
        });
    });

    it('should read the title from the parent route', done => {
        articleService.findArticleByTitle.mockReturnValue(of({ found: false, canCreate: true }));

        resolveNewArticle(
            articleService as unknown as ArticleService,
            router as unknown as Router,
            createChildRouteSnapshot({ title: 'НОВАЯ+СТАТЬЯ' }),
        ).subscribe(result => {
            expect(articleService.findArticleByTitle).toHaveBeenCalledWith('НОВАЯ СТАТЬЯ');
            expect(result).toEqual(expect.objectContaining({ mode: 'create', title: 'НОВАЯ СТАТЬЯ' }));
            done();
        });
    });

    it('should redirect back to the placeholder when the lookup fails', done => {
        articleService.findArticleByTitle.mockReturnValue(throwError(() => new Error('Network error')));

        resolve({ title: 'НОВАЯ+СТАТЬЯ' }).subscribe(result => {
            expect(result).toBeInstanceOf(RedirectCommand);
            expect(router.parseUrl).toHaveBeenCalledWith('/articles/find/НОВАЯ+СТАТЬЯ');
            done();
        });
    });
});
