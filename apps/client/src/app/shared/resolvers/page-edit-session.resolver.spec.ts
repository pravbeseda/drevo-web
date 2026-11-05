import { resolvePageEditSession } from './page-edit-session.resolver';
import { ArticleService } from '../../services/articles';
import { toEditSession } from '../models/page-edit-session';
import { createMockArticle } from '../testing/article-testing.helper';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import { UrlSegment } from '@angular/router';
import { of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

describe('resolvePageEditSession', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticleVersion'>>;

    beforeEach(() => {
        articleService = { getArticleVersion: jest.fn() };
    });

    it('should return article version when valid ID is provided', done => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));
        const route = createRouteSnapshot({ versionId: '456' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toEqual(toEditSession(mockArticle, 'articles'));
            expect(articleService.getArticleVersion).toHaveBeenCalledWith(456, 'articles');
            done();
        });
    });

    it('should return undefined for non-numeric ID', done => {
        const route = createRouteSnapshot({ versionId: 'abc' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for zero ID', done => {
        const route = createRouteSnapshot({ versionId: '0' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined for negative ID', done => {
        const route = createRouteSnapshot({ versionId: '-5' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it.each([
        // Number() reads every JavaScript literal form, and none of them is an
        // id the URL pattern or the backend names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['padded with a leading zero', '042'],
    ])('should return undefined for an ID %s, without asking the API', (_case, versionId) => {
        const route = createRouteSnapshot({ versionId });
        // A sentinel, so that an observable that never emitted cannot pass as undefined.
        let result: unknown = 'not resolved';

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(
            value => (result = value),
        );

        expect(result).toBeUndefined();
        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });

    it('should return undefined when a segment carries matrix params, without asking the API', () => {
        // Angular merges `;versionId=456` over the positional `1`, so the paramMap
        // reads 456 under an address the route pattern never named.
        const route = createRouteSnapshot({ versionId: '456' }, [new UrlSegment('1', { versionId: '456' })]);
        // A sentinel, so that an observable that never emitted cannot pass as undefined.
        let result: unknown = 'not resolved';

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(
            value => (result = value),
        );

        expect(result).toBeUndefined();
        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });

    it('should return undefined for missing ID param', done => {
        const route = createRouteSnapshot({});

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toBeUndefined();
            expect(articleService.getArticleVersion).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return undefined on HTTP error', done => {
        articleService.getArticleVersion.mockReturnValue(throwError(() => new Error('Server error')));
        const route = createRouteSnapshot({ versionId: '456' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'articles').subscribe(result => {
            expect(result).toBeUndefined();
            done();
        });
    });

    it('should open a news version for editing through the news endpoints', done => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));
        const route = createRouteSnapshot({ versionId: '70' });

        resolvePageEditSession(articleService as unknown as ArticleService, route, 'news').subscribe(result => {
            expect(articleService.getArticleVersion).toHaveBeenCalledWith(70, 'news');
            expect(result?.kind).toBe('news');
            done();
        });
    });
});
