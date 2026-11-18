import { resolveNewsCreateSession, NewsCreateDeps } from './news-create-session.resolver';
import { ArticleService } from '../../services/articles';
import { AuthService } from '../../services/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RedirectCommand, Router, UrlTree } from '@angular/router';
import { NotificationService } from '@drevo-web/core';
import { MockLoggerService } from '@drevo-web/core/testing';
import { createMockUser } from '@drevo-web/shared/testing';
import { defer, firstValueFrom, of, throwError } from 'rxjs';

describe('resolveNewsCreateSession', () => {
    const origin = { exitUrl: '/articles/42/news', draftKey: '/articles/42/news/new' };
    const topics = [{ id: 3, title: 'Церковь' }];
    const exitTree = new UrlTree();
    const editor = createMockUser({ permissions: { canEdit: true } });

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

    function deps(currentUser: AuthService['currentUser'], isBrowser = true): NewsCreateDeps {
        return {
            authService: { currentUser } as AuthService,
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
        expect(redirect.navigationBehaviorOptions).toEqual({ replaceUrl: true });
        expect(router.parseUrl).toHaveBeenCalledWith('/articles/42/news');
    }

    it('opens an empty news item that leaves to where it was asked for', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(editor)));

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

    it('sends a reader past the news limit back to where the news was asked for, telling them why', async () => {
        articleService.checkEdit.mockReturnValue(of({ allowed: false, reason: 'Лимит исчерпан' }));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(editor)));

        expectSentBack(result);
        expect(notificationService.error).toHaveBeenCalledWith('Лимит исчерпан');
        expect(logger.warn).toHaveBeenCalledWith('Editor refused', { kind: 'news', reason: 'Лимит исчерпан' });
    });

    it('sends the reader back when the check itself fails, and logs the cause', async () => {
        const failure = new HttpErrorResponse({ status: 500 });
        articleService.checkEdit.mockReturnValue(throwError(() => failure));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(editor)));

        expectSentBack(result);
        expect(notificationService.error).toHaveBeenCalledWith('Не удалось проверить права на редактирование');
        expect(logger.error).toHaveBeenCalledWith('Editor access check failed', failure);
    });

    it('sends a reader who may not edit back to where the news was asked for', async () => {
        const user = createMockUser({ permissions: { canEdit: false } });
        const requestTopics = jest.fn(() => of(topics));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, defer(requestTopics), deps(user)));

        expectSentBack(result);
        expect(logger.warn).toHaveBeenCalledWith('News creation denied: no right to edit', origin);
        expect(requestTopics).not.toHaveBeenCalled();
        expect(articleService.checkEdit).not.toHaveBeenCalled();
    });

    it('sends back a reader the browser knows no user for', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(undefined)));

        expect(result).toBeInstanceOf(RedirectCommand);
    });

    it('opens the editor on the server, which knows no user and leaves the check to the browser', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(undefined, false)));

        expect(result).toEqual(expect.objectContaining({ mode: 'create', exitUrl: '/articles/42/news' }));
        expect(articleService.checkEdit).not.toHaveBeenCalled();
    });
});
