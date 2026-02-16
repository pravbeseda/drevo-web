import { resolveArticleTitle } from './article-title.resolver';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { ArticleService } from '../../services/articles';
import { ArticleVersion } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 123,
    versionId: 456,
    title: 'Фотосинтез',
    content: '<p>Content</p>',
    author: 'Author',
    date: new Date('2024-01-15'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

function createRouteSnapshot(params: Record<string, string>): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('resolveArticleTitle', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticle'>>;

    beforeEach(() => {
        articleService = { getArticle: jest.fn() };
    });

    it('should return article title when valid ID is provided', done => {
        articleService.getArticle.mockReturnValue(of(mockArticle));
        const route = createRouteSnapshot({ id: '123' });

        resolveArticleTitle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBe('Фотосинтез');
            expect(articleService.getArticle).toHaveBeenCalledWith(123);
            done();
        });
    });

    it('should return fallback title for invalid ID', done => {
        const route = createRouteSnapshot({ id: 'invalid' });

        resolveArticleTitle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBe('Статья');
            expect(articleService.getArticle).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return fallback title for missing ID', done => {
        const route = createRouteSnapshot({});

        resolveArticleTitle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBe('Статья');
            done();
        });
    });

    it('should return fallback title on HTTP error', done => {
        articleService.getArticle.mockReturnValue(throwError(() => new Error('Server error')));
        const route = createRouteSnapshot({ id: '123' });

        resolveArticleTitle(articleService as unknown as ArticleService, route).subscribe(result => {
            expect(result).toBe('Статья');
            done();
        });
    });
});
