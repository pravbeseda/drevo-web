import { forumMessageMatcher, forumMessageRedirectGuard } from './forum-message-redirect.guard';
import { ForumService } from '../../../services/forum/forum.service';
import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { EnvironmentInjector, Injectable, runInInjectionContext } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlSegment,
    UrlSegmentGroup,
    UrlTree,
    provideRouter,
} from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { MockLogger, MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';

@Injectable()
class GuardTestHelper {}

describe('forumMessageMatcher', () => {
    const match = (...paths: string[]) =>
        forumMessageMatcher(
            paths.map(path => new UrlSegment(path, {})),
            new UrlSegmentGroup([], {}),
            {},
        );

    it('takes a single message id and names it messageId', () => {
        const result = match('123');

        expect(result?.consumed.map(segment => segment.path)).toEqual(['123']);
        expect(result?.posParams?.['messageId'].path).toBe('123');
    });

    it.each([
        ['a section', ['common']],
        ['zero', ['0']],
        ['a leading zero', ['0123']],
        ['a number with a tail', ['12abc']],
        ['two segments', ['123', '45']],
        ['no segment', []],
    ])('leaves %s to the routes after it', (_case, paths) => {
        expect(match(...paths)).toBeNull();
    });

    it('leaves an id carrying matrix params to the routes after it', () => {
        const result = forumMessageMatcher([new UrlSegment('123', { id: '7' })], new UrlSegmentGroup([], {}), {});

        expect(result).toBeNull();
    });
});

describe('forumMessageRedirectGuard', () => {
    let spectator: SpectatorService<GuardTestHelper>;
    let forumService: { getMessageTopic: jest.Mock };
    let logger: MockLogger;

    const createService = createServiceFactory({
        service: GuardTestHelper,
        providers: [provideRouter([]), mockLoggerProvider(), { provide: ForumService, useFactory: () => forumService }],
    });

    beforeEach(() => {
        forumService = { getMessageTopic: jest.fn().mockReturnValue(of(42)) };
        spectator = createService();
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    });

    const redirectOf = async (route: ActivatedRouteSnapshot): Promise<string> => {
        const result = runInInjectionContext(spectator.inject(EnvironmentInjector), () =>
            forumMessageRedirectGuard(route, {} as RouterStateSnapshot),
        );
        const value = isObservable(result) ? await firstValueFrom(result as Observable<unknown>) : await result;
        expect(value).toBeInstanceOf(UrlTree);
        return spectator.inject(Router).serializeUrl(value as UrlTree);
    };

    it('opens the topic of the message, anchored on it', async () => {
        expect(await redirectOf(createRouteSnapshot({ messageId: '99' }))).toBe('/forum/topic/42/99');
        expect(forumService.getMessageTopic).toHaveBeenCalledWith(99);
    });

    it('sends an address whose id it cannot read to the forum, asking nothing', async () => {
        const route = createRouteSnapshot({ messageId: '99' }, [new UrlSegment('99', { id: '7' })]);

        expect(await redirectOf(route)).toBe('/forum');
        expect(forumService.getMessageTopic).not.toHaveBeenCalled();
    });

    it('sends a message the forum does not know to the topic page, which reports it not found', async () => {
        forumService.getMessageTopic.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        expect(await redirectOf(createRouteSnapshot({ messageId: '99' }))).toBe('/forum/topic/99');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs a failed lookup and leaves the outcome to the topic page', async () => {
        const error = new HttpErrorResponse({ status: 500 });
        forumService.getMessageTopic.mockReturnValue(throwError(() => error));

        expect(await redirectOf(createRouteSnapshot({ messageId: '99' }))).toBe('/forum/topic/99');
        expect(logger.error).toHaveBeenCalledWith('Failed to resolve the forum message 99', error);
    });
});
