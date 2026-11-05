import { resolveNewsCreateSession, NewsCreateDeps } from './news-create-session.resolver';
import { AuthService } from '../../services/auth/auth.service';
import { RedirectCommand, Router, UrlTree } from '@angular/router';
import { MockLoggerService } from '@drevo-web/core/testing';
import { createMockUser } from '@drevo-web/shared/testing';
import { defer, firstValueFrom, of } from 'rxjs';

describe('resolveNewsCreateSession', () => {
    const origin = { exitUrl: '/articles/42/news', draftKey: '/articles/42/news/new' };
    const topics = [{ id: 3, title: 'Церковь' }];
    const exitTree = new UrlTree();

    let logger: ReturnType<MockLoggerService['withContext']>;
    let router: jest.Mocked<Pick<Router, 'parseUrl'>>;

    beforeEach(() => {
        logger = new MockLoggerService().withContext('test');
        router = { parseUrl: jest.fn().mockReturnValue(exitTree) };
    });

    function deps(currentUser: AuthService['currentUser'], isBrowser = true): NewsCreateDeps {
        return {
            authService: { currentUser } as AuthService,
            isBrowser,
            router: router as unknown as Router,
            logger,
        };
    }

    it('opens an empty news item that leaves to where it was asked for', async () => {
        const user = createMockUser({ permissions: { canEdit: true } });

        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(user)));

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
    });

    it('sends a reader who may not edit back to where the news was asked for', async () => {
        const user = createMockUser({ permissions: { canEdit: false } });
        const requestTopics = jest.fn(() => of(topics));

        const result = await firstValueFrom(resolveNewsCreateSession(origin, defer(requestTopics), deps(user)));

        expect(result).toBeInstanceOf(RedirectCommand);
        const redirect = result as RedirectCommand;
        expect(redirect.redirectTo).toBe(exitTree);
        expect(redirect.navigationBehaviorOptions).toEqual({ replaceUrl: true });
        expect(router.parseUrl).toHaveBeenCalledWith('/articles/42/news');
        expect(logger.warn).toHaveBeenCalledWith('News creation denied: no right to edit', origin);
        expect(requestTopics).not.toHaveBeenCalled();
    });

    it('sends back a reader the browser knows no user for', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(undefined)));

        expect(result).toBeInstanceOf(RedirectCommand);
    });

    it('opens the editor on the server, which knows no user and leaves the check to the browser', async () => {
        const result = await firstValueFrom(resolveNewsCreateSession(origin, of(topics), deps(undefined, false)));

        expect(result).toEqual(expect.objectContaining({ mode: 'create', exitUrl: '/articles/42/news' }));
    });
});
