import { PageEditSessionDeps, resolvePageEditSession } from './page-edit-session.resolver';
import { ArticleService } from '../../services/articles';
import { toEditSession } from '../models/page-edit-session';
import { createMockArticle } from '../testing/article-testing.helper';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, RedirectCommand, Router, UrlSegment, UrlTree } from '@angular/router';
import { NotificationService } from '@drevo-web/core';
import { createMockLogger, MockLogger } from '@drevo-web/core/testing';
import { PageKind } from '@drevo-web/shared';
import { firstValueFrom, of, throwError } from 'rxjs';

const mockArticle = createMockArticle();

describe('resolvePageEditSession', () => {
    let articleService: jest.Mocked<Pick<ArticleService, 'getArticleVersion' | 'checkEdit'>>;
    let notificationService: jest.Mocked<Pick<NotificationService, 'error'>>;
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;
    let logger: MockLogger;
    let isBrowser: boolean;
    const pageTree = new UrlTree();

    const resolve = (route: ActivatedRouteSnapshot, kind: PageKind = 'articles'): Promise<unknown> => {
        const deps: PageEditSessionDeps = {
            articleService: articleService as unknown as ArticleService,
            notificationService: notificationService as unknown as NotificationService,
            router: router as unknown as Router,
            logger,
            isBrowser,
        };
        return firstValueFrom(resolvePageEditSession(deps, route, kind));
    };

    beforeEach(() => {
        articleService = { getArticleVersion: jest.fn(), checkEdit: jest.fn().mockReturnValue(of({ allowed: true })) };
        notificationService = { error: jest.fn() };
        router = { parseUrl: jest.fn().mockReturnValue(pageTree) };
        logger = createMockLogger();
        isBrowser = true;
    });

    it('should open the version for editing when the check allows it', async () => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toEqual(
            toEditSession(mockArticle, 'articles'),
        );

        expect(articleService.getArticleVersion).toHaveBeenCalledWith(456, 'articles');
        expect(articleService.checkEdit).toHaveBeenCalledWith('articles', 456);
        expect(notificationService.error).not.toHaveBeenCalled();
    });

    function expectSentToThePage(result: unknown): void {
        expect(result).toBeInstanceOf(RedirectCommand);
        const redirect = result as RedirectCommand;
        expect(redirect.redirectTo).toBe(pageTree);
        expect(redirect.navigationBehaviorOptions).toEqual({ replaceUrl: true });
        expect(router.parseUrl).toHaveBeenCalledWith('/articles/123');
    }

    it('should send the reader to the page and tell them why when the check refuses', async () => {
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));
        articleService.checkEdit.mockReturnValue(of({ allowed: false, reason: 'Лимит исчерпан' }));

        expectSentToThePage(await resolve(createRouteSnapshot({ versionId: '456' })));

        expect(notificationService.error).toHaveBeenCalledWith('Лимит исчерпан');
        expect(logger.warn).toHaveBeenCalledWith('Editor refused', {
            kind: 'articles',
            versionId: 456,
            reason: 'Лимит исчерпан',
        });
    });

    it('should refuse and log the cause when the check itself fails', async () => {
        const failure = new HttpErrorResponse({ status: 500 });
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));
        articleService.checkEdit.mockReturnValue(throwError(() => failure));

        expectSentToThePage(await resolve(createRouteSnapshot({ versionId: '456' })));

        expect(notificationService.error).toHaveBeenCalledWith('Не удалось проверить права на редактирование');
        expect(logger.error).toHaveBeenCalledWith('Editor access check failed', failure);
    });

    it('should answer a missing version whatever the check says, without a toast', async () => {
        const gone = new HttpErrorResponse({ status: 404 });
        articleService.getArticleVersion.mockReturnValue(throwError(() => gone));
        articleService.checkEdit.mockReturnValue(throwError(() => gone));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toBe('not-found');

        expect(notificationService.error).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should open the editor on the server without asking, leaving the check to the browser', async () => {
        isBrowser = false;
        articleService.getArticleVersion.mockReturnValue(of(mockArticle));

        await expect(resolve(createRouteSnapshot({ versionId: '456' }))).resolves.toEqual(
            toEditSession(mockArticle, 'articles'),
        );

        expect(articleService.checkEdit).not.toHaveBeenCalled();
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
        expect(articleService.checkEdit).not.toHaveBeenCalled();
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
        expect(articleService.checkEdit).toHaveBeenCalledWith('news', 70);
    });
});
