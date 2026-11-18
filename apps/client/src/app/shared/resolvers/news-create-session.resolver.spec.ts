import { resolveNewsCreateSession, NewsCreateDeps } from './news-create-session.resolver';
import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';
import { RedirectCommand, Router, UrlTree } from '@angular/router';
import { NotificationService } from '@drevo-web/core';
import { MockLoggerService } from '@drevo-web/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('resolveNewsCreateSession', () => {
    const origin = { exitUrl: '/articles/42/news', draftKey: '/articles/42/news/new' };
    const topics = [{ id: 3, title: 'Церковь' }];
    const exitTree = new UrlTree();

    let logger: ReturnType<MockLoggerService['withContext']>;
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;
    let articleService: jest.Mocked<Pick<ArticleService, 'checkEdit'>>;
    let notificationService: jest.Mocked<Pick<NotificationService, 'error'>>;

    beforeEach(() => {
        logger = new MockLoggerService().withContext('test');
        router = { parseUrl: jest.fn().mockReturnValue(exitTree) };
        articleService = { checkEdit: jest.fn().mockReturnValue(of({ allowed: true })) };
        notificationService = { error: jest.fn() };
    });

    function deps(isBrowser = true): NewsCreateDeps {
        return {
            articleService: articleService as unknown as ArticleService,
            notificationService: notificationService as unknown as NotificationService,
            isBrowser,
            router: router as unknown as Router,
            logger,
        };
    }

    function expectSentBack(result: unknown): void {
        expect(result).toBeInstanceOf(RedirectCommand);
        const redirect = result as RedirectCommand;
        expect(redirect.redirectTo).toBe(exitTree);
        // The router picks replace for an address typed in and push for a click on its own.
        expect(redirect.navigationBehaviorOptions).toBeUndefined();
        expect(router.parseUrl).toHaveBeenCalledWith('/articles/42/news');
    }

    it('opens an empty news item that leaves to where it was asked for', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps()));

        expect(result).toEqual({
            kind: 'news',
            mode: 'create',
            articleId: 0,
            versionId: 0,
            title: '',
            content: '',
            exitUrl: '/articles/42/news',
            draftKey: '/articles/42/news/new',
            newsTopics: topics,
        });
        expect(articleService.checkEdit).toHaveBeenCalledWith('news', undefined);
    });

    it.each([
        ['without the right to edit', 'Недостаточно прав для создания новостей'],
        ['past the news limit', 'Лимит исчерпан'],
    ])('sends a reader %s back to where the news was asked for, telling them why', async (_case, reason) => {
        articleService.checkEdit.mockReturnValue(of({ allowed: false, reason }));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps()));

        expectSentBack(result);
        expect(notificationService.error).toHaveBeenCalledWith(reason);
        expect(logger.warn).toHaveBeenCalledWith('Editor refused', { kind: 'news', reason });
    });

    it('sends the reader back when the check itself fails, and logs the cause', async () => {
        const failure = new HttpErrorResponse({ status: 500 });
        articleService.checkEdit.mockReturnValue(throwError(() => failure));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps()));

        expectSentBack(result);
        expect(notificationService.error).toHaveBeenCalledWith('Не удалось проверить права на редактирование');
        expect(logger.error).toHaveBeenCalledWith('Editor access check failed', failure);
    });

    it('opens the editor on the server, which knows no user and leaves the check to the browser', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(false)));

        expect(result).toEqual(expect.objectContaining({ mode: 'create', exitUrl: '/articles/42/news' }));
        expect(articleService.checkEdit).not.toHaveBeenCalled();
    });
});
