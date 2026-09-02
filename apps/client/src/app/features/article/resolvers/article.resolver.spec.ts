import { resolveArticle } from './article.resolver';
import { createMockArticle } from '../testing/article-testing.helper';
import { ActivatedRouteSnapshot, convertToParamMap, UrlSegment } from '@angular/router';
import { ArticleService } from '../../../services/articles';
import { of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

function createRouteSnapshot(
    params: Record<string, string>,
    // A matched path with no matrix params is the default, so that only the
    // cases about them have to spell their segments out.
    segments: UrlSegment[] = Object.values(params).map(value => new UrlSegment(value, {})),
): ActivatedRouteSnapshot {
    return {
        paramMap: convertToParamMap(params),
        pathFromRoot: [{ url: segments } as ActivatedRouteSnapshot],
    } as ActivatedRouteSnapshot;
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

    it.each([
        // Number() reads every JavaScript literal form, and none of them is an
        // id the URL pattern or the backend names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['padded with a leading zero', '042'],
    ])('should return undefined for an ID %s, without asking the API', (_case, id) => {
        const route = createRouteSnapshot({ id });
        // A sentinel, so that an observable that never emitted cannot pass as undefined.
        let result: unknown = 'not resolved';

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(value => (result = value));

        expect(result).toBeUndefined();
        expect(articleService.getArticle).not.toHaveBeenCalled();
    });

    it('should return undefined when a segment carries matrix params, without asking the API', () => {
        // Angular merges `;id=123` over the positional `1`, so the paramMap reads
        // 123 under an address the route pattern never named.
        const route = createRouteSnapshot({ id: '123' }, [new UrlSegment('1', { id: '123' })]);
        // A sentinel, so that an observable that never emitted cannot pass as undefined.
        let result: unknown = 'not resolved';

        resolveArticle(articleService as unknown as ArticleService, route).subscribe(value => (result = value));

        expect(result).toBeUndefined();
        expect(articleService.getArticle).not.toHaveBeenCalled();
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
