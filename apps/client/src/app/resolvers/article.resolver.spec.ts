import { resolveArticle } from './article.resolver';
import { createMockArticle } from '../pages/article/article-testing.helper';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { ArticleService } from '../services/articles';
import { of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('resolveArticle', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticle'>>;

    beforeEach(() => {
        articleService = { getArticle: jest.fn() };
    });

    it('should return article when valid ID is provided', done => {
        articleService.getArticle.mockReturnValue(of(mockArticle));
        const route = createRouteSnapshot({ id: '123' });

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toEqual(mockArticle);
            expect(articleService.getArticle).toHaveBeenCalledWith(123);
            done();
        });
    });

    it('should return undefined for non-numeric ID', done => {
        const route = createRouteSnapshot({ id: 'abc' });

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticle).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for zero ID', done => {
        const route = createRouteSnapshot({ id: '0' });

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticle).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for negative ID', done => {
        const route = createRouteSnapshot({ id: '-5' });

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticle).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for missing ID param', done => {
        const route = createRouteSnapshot({});

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticle).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined on HTTP error', done => {
        articleService.getArticle.mockReturnValue(throwError(() => new Error('Server error')));
        const route = createRouteSnapshot({ id: '123' });

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            done();
        });
    });
});
