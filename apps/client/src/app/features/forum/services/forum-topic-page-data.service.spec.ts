import { ForumTopicPageDataService, ForumTopicResolveResult } from './forum-topic-page-data.service';
import { ForumService } from '../../../services/forum/forum.service';
import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { UrlSegment } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { MockLogger, MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumTopicPage } from '@drevo-web/shared';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

const topicPage: ForumTopicPage = {
    topic: {
        id: 42,
        title: 'Тема',
        part: 'common',
        partId: undefined,
        article: undefined,
        author: 'Автор',
        createdAt: undefined,
        repliesCount: 0,
    },
    messages: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
};

describe('ForumTopicPageDataService', () => {
    let spectator: SpectatorService<ForumTopicPageDataService>;
    let forumService: { getTopic: jest.Mock };
    let logger: MockLogger;

    const createService = createServiceFactory({
        service: ForumTopicPageDataService,
        providers: [mockLoggerProvider(), { provide: ForumService, useFactory: () => forumService }],
    });

    beforeEach(() => {
        forumService = { getTopic: jest.fn().mockReturnValue(of(topicPage)) };
        spectator = createService();
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    });

    const load = (
        params: Record<string, string>,
        queryParams: Record<string, string> = {},
        segments?: UrlSegment[],
    ): ForumTopicResolveResult | undefined => {
        let result: ForumTopicResolveResult | undefined;
        spectator.service.load(createRouteSnapshot(params, segments, queryParams)).subscribe(value => (result = value));
        return result;
    };

    it('loads the topic the address names', () => {
        expect(load({ id: '42' })).toBe(topicPage);
        expect(forumService.getTopic).toHaveBeenCalledWith(42, undefined, undefined);
    });

    it('reads the page from the query', () => {
        load({ id: '42' }, { page: '3' });

        expect(forumService.getTopic).toHaveBeenCalledWith(42, 3, undefined);
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-1'],
    ])('asks for the first page when the query page is %s', (_case, page) => {
        load({ id: '42' }, { page });

        expect(forumService.getTopic).toHaveBeenCalledWith(42, undefined, undefined);
    });

    it('anchors on the message the address names', () => {
        load({ id: '42', messageId: '7' });

        expect(forumService.getTopic).toHaveBeenCalledWith(42, undefined, 7);
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-5'],
        ['fractional', '1.5'],
        // Number() reads every JavaScript literal form, and none of them is an
        // id the URL pattern or the backend names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['padded with a leading zero', '042'],
    ])('answers not-found for a topic id %s, without asking the API', (_case, id) => {
        expect(load({ id })).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the address names no topic, without asking the API', () => {
        expect(load({})).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-5'],
    ])('answers not-found for a message id %s, without asking the API', (_case, messageId) => {
        expect(load({ id: '42', messageId })).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the topic segment carries matrix params, without asking the API', () => {
        // `/forum/topic/1;id=42` — Angular merges `;id=42` over the positional
        // `1`, so the paramMap reads a topic the address never named.
        expect(load({ id: '42' }, {}, [new UrlSegment('1', { id: '42' })])).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the API answers 404', () => {
        forumService.getTopic.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
        );

        expect(load({ id: '42' })).toBe('not-found');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('answers load-error when the request fails for any other reason', () => {
        forumService.getTopic.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
        );

        expect(load({ id: '42' })).toBe('load-error');
    });

    it('answers load-error when the request fails without an HTTP response', () => {
        forumService.getTopic.mockReturnValue(throwError(() => new Error('Network error')));

        expect(load({ id: '42' })).toBe('load-error');
    });

    it('reports the failure that produced the load-error', () => {
        const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
        forumService.getTopic.mockReturnValue(throwError(() => failure));

        load({ id: '42' });

        // The error itself is the payload, so its stack reaches Sentry intact.
        expect(logger.error).toHaveBeenCalledWith('Failed to load the forum topic 42', failure);
    });

    describe('the cache the route readers share', () => {
        it('asks the API once, however many resolvers on the route read it', () => {
            load({ id: '42' });
            load({ id: '42' });

            expect(forumService.getTopic).toHaveBeenCalledTimes(1);
        });

        it('loads again when the address names another topic', () => {
            load({ id: '42' });
            load({ id: '43' });

            expect(forumService.getTopic).toHaveBeenCalledTimes(2);
            expect(forumService.getTopic).toHaveBeenLastCalledWith(43, undefined, undefined);
        });

        it('loads again when the address anchors on another message', () => {
            load({ id: '42', messageId: '7' });
            load({ id: '42', messageId: '8' });

            expect(forumService.getTopic).toHaveBeenCalledTimes(2);
            expect(forumService.getTopic).toHaveBeenLastCalledWith(42, undefined, 8);
        });

        it('loads again when the query names another page', () => {
            load({ id: '42' }, { page: '2' });
            load({ id: '42' }, { page: '3' });

            expect(forumService.getTopic).toHaveBeenCalledTimes(2);
            expect(forumService.getTopic).toHaveBeenLastCalledWith(42, 3, undefined);
        });

        it('keeps a rejected address out of the cache entry of an accepted one', () => {
            expect(load({ id: '42' }, {}, [new UrlSegment('1', { id: '42' })])).toBe('not-found');

            expect(load({ id: '42' })).toBe(topicPage);
            expect(forumService.getTopic).toHaveBeenCalledTimes(1);
        });

        it('replays the loaded topic to a reader that subscribes after the load', () => {
            load({ id: '42' });
            forumService.getTopic.mockClear();

            expect(load({ id: '42' })).toBe(topicPage);
            expect(forumService.getTopic).not.toHaveBeenCalled();
        });
    });
});
