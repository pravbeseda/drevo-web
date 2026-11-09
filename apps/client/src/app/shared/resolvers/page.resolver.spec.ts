import { createMockArticle } from '../testing/article-testing.helper';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import { resolvePage } from './page.resolver';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { ArticleService } from '../../services/articles';
import { Logger } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { firstValueFrom, of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

describe('resolvePage', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticle'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    const resolve = (route: ActivatedRouteSnapshot, kind: PageKind = 'articles'): Promise<unknown> =>
        firstValueFrom(
            resolvePage(articleService as unknown as ArticleService, logger as unknown as Logger, route, kind),
        );

    beforeEach(() => {
        articleService = { getArticle: jest.fn() };
        logger = { error: jest.fn() };
    });

    it('should return article when valid ID is provided', async () => {
        articleService.getArticle.mockReturnValue(of(mockArticle));

        await expect(resolve(createRouteSnapshot({ id: '123' }))).resolves.toEqual(mockArticle);

        expect(articleService.getArticle).toHaveBeenCalledWith(123, 'articles');
    });

    it.each([
        ['non-numeric', 'abc'],
        ['zero', '0'],
        ['negative', '-5'],
        // Number() reads every JavaScript literal form, and none of them is an
        // id the URL pattern or the backend names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['padded with a leading zero', '042'],
    ])('should return not-found for an ID %s, without asking the API', async (_case, id) => {
        await expect(resolve(createRouteSnapshot({ id }))).resolves.toBe('not-found');

        expect(articleService.getArticle).not.toHaveBeenCalled();
    });

    it('should return not-found when a segment carries matrix params, without asking the API', async () => {
        // Angular merges `;id=123` over the positional `1`, so the paramMap reads
        // 123 under an address the route pattern never named.
        const route = createRouteSnapshot({ id: '123' }, [new UrlSegment('1', { id: '123' })]);

        await expect(resolve(route)).resolves.toBe('not-found');

        expect(articleService.getArticle).not.toHaveBeenCalled();
    });

    it('should return not-found for missing ID param', async () => {
        await expect(resolve(createRouteSnapshot({}))).resolves.toBe('not-found');

        expect(articleService.getArticle).not.toHaveBeenCalled();
    });

    it('should return not-found on a 404, without a log entry', async () => {
        articleService.getArticle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        await expect(resolve(createRouteSnapshot({ id: '123' }))).resolves.toBe('not-found');

        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return load-error and log its cause on any other failure', async () => {
        const failure = new HttpErrorResponse({ status: 500 });
        articleService.getArticle.mockReturnValue(throwError(() => failure));

        await expect(resolve(createRouteSnapshot({ id: '123' }))).resolves.toBe('load-error');

        expect(logger.error).toHaveBeenCalledWith('Failed to load the articles page 123', failure);
    });

    it('should read a news item through the news endpoints', async () => {
        articleService.getArticle.mockReturnValue(of(mockArticle));

        await resolve(createRouteSnapshot({ id: '7' }), 'news');

        expect(articleService.getArticle).toHaveBeenCalledWith(7, 'news');
    });
});
