import { resolveArticleVersion } from './article-version.resolver';
import { createMockArticle } from '../testing/article-testing.helper';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { ArticleService } from '../../../services/articles';
import { of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('resolveArticleVersion', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticleVersion'>>;

    beforeEach(() => {
        articleService = { getArticleVersion: jest.fn() };
    });

    it('should return article version when valid ID is provided', done => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));
        const route = createRouteSnapshot({ id: '456' });

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toEqual(mockArticle);
            expect(articleService.getArticleVersion).toHaveBeenCalledWith(456);
            done();
        });
    });

    it('should return undefined for non-numeric ID', done => {
        const route = createRouteSnapshot({ id: 'abc' });

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for zero ID', done => {
        const route = createRouteSnapshot({ id: '0' });

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for negative ID', done => {
        const route = createRouteSnapshot({ id: '-5' });

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for missing ID param', done => {
        const route = createRouteSnapshot({});

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined on HTTP error', done => {
        articleService.getArticleVersion.mockReturnValue(throwError(() => new Error('Server error')));
        const route = createRouteSnapshot({ id: '456' });

        resolveArticleVersion(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBeUndefined();
            done();
        });
    });
});
