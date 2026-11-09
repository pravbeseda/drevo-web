import { resolvePageEditSession } from './page-edit-session.resolver';
import { ArticleService } from '../../services/articles';
import { toEditSession } from '../models/page-edit-session';
import { createMockArticle } from '../testing/article-testing.helper';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { firstValueFrom, of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

describe('resolvePageEditSession', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticleVersion'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    const resolve = (route: ActivatedRouteSnapshot, kind: PageKind = 'articles'): Promise<unknown> =>
        firstValueFrom(
            resolvePageEditSession(
                articleService as unknown as ArticleService,
                logger as unknown as Logger,
                route,
                kind,
            ),
        );

    beforeEach(() => {
        articleService = { getArticleVersion: jest.fn() };
        logger = { error: jest.fn() };
    });

    it('should return article version when valid ID is provided', async () => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toEqual(
            toEditSession(mockArticle, 'articles'),
        );

        expect(articleService.getArticleVersion).toHaveBeenCalledWith(456, 'articles');
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
    ])('should return not-found for an ID %s, without asking the API', async (_case, versionId) => {
        await expect(resolve(createRouteSnapshot({ versionId }))).resolves.toBe('not-found');

        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });

    it('should return not-found when a segment carries matrix params, without asking the API', async () => {
        // Angular merges `;versionId=456` over the positional `1`, so the paramMap
        // reads 456 under an address the route pattern never named.
        const route = createRouteSnapshot({ versionId: '456' }, [new UrlSegment('1', { versionId: '456' })]);

        await expect(resolve(route)).resolves.toBe('not-found');

        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });

    it('should return not-found for missing ID param', async () => {
        await expect(resolve(createRouteSnapshot({}))).resolves.toBe('not-found');

        expect(articleService.getArticleVersion).not.toHaveBeenCalled();
    });

    it('should return not-found on a 404, without a log entry', async () => {
        articleService.getArticleVersion.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toBe('not-found');

        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return load-error and log its cause on any other failure', async () => {
        const failure = new HttpErrorResponse({ status: 500 });
        articleService.getArticleVersion.mockReturnValue(throwError(() => failure));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toBe('load-error');

        expect(logger.error).toHaveBeenCalledWith('Failed to load the articles version 456', failure);
    });

    it('should open a news version for editing through the news endpoints', async () => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));

        await expect(resolve(createRouteSnapshot({ versionId: '70' }), 'news')).resolves.toEqual(
            toEditSession(mockArticle, 'news'),
        );

        expect(articleService.getArticleVersion).toHaveBeenCalledWith(70, 'news');
    });
});
