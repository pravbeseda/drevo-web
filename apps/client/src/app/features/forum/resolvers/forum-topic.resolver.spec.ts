import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { resolveForumTopic } from './forum-topic.resolver';
import { ForumService } from '../../../services/forum/forum.service';
import { HttpErrorResponse } from '@angular/common/http';
import { UrlSegment } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { ForumTopicPage } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

describe('resolveForumTopic', () => {
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

    let forumService: jest.Mocked<Pick<ForumService, 'getTopic'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    beforeEach(() => {
        forumService = { getTopic: jest.fn().mockReturnValue(of(topicPage)) };
        logger = { error: jest.fn() };
    });

    const resolve = (
        params: Record<string, string>,
        queryParams: Record<string, string> = {},
        segments?: UrlSegment[],
    ): unknown => {
        let result: unknown;
        resolveForumTopic(
            forumService as unknown as ForumService,
            logger as unknown as Logger,
            createRouteSnapshot(params, segments, queryParams),
        ).subscribe(value => (result = value));
        return result;
    };

    it('loads the topic the address names', () => {
        expect(resolve({ id: '42' })).toBe(topicPage);
        expect(forumService.getTopic).toHaveBeenCalledWith(42, undefined, undefined);
    });

    it('reads the page from the query', () => {
        resolve({ id: '42' }, { page: '3' });

        expect(forumService.getTopic).toHaveBeenCalledWith(42, 3, undefined);
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-1'],
    ])('asks for the first page when the query page is %s', (_case, page) => {
        resolve({ id: '42' }, { page });

        expect(forumService.getTopic).toHaveBeenCalledWith(42, undefined, undefined);
    });

    it('anchors on the message the address names', () => {
        resolve({ id: '42', messageId: '7' });

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
        expect(resolve({ id })).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the address names no topic, without asking the API', () => {
        expect(resolve({})).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-5'],
    ])('answers not-found for a message id %s, without asking the API', (_case, messageId) => {
        expect(resolve({ id: '42', messageId })).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the topic segment carries matrix params, without asking the API', () => {
        // `/forum/topic/1;id=42` — Angular merges `;id=42` over the positional
        // `1`, so the paramMap reads a topic the address never named.
        expect(resolve({ id: '42' }, {}, [new UrlSegment('1', { id: '42' })])).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the message segment carries matrix params, without asking the API', () => {
        expect(
            resolve({ id: '42', messageId: '7' }, {}, [
                new UrlSegment('42', {}),
                new UrlSegment('1', { messageId: '7' }),
            ]),
        ).toBe('not-found');
        expect(forumService.getTopic).not.toHaveBeenCalled();
    });

    it('answers not-found when the API answers 404', () => {
        forumService.getTopic.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
        );

        expect(resolve({ id: '42' })).toBe('not-found');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('answers load-error when the request fails for any other reason', () => {
        forumService.getTopic.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
        );

        expect(resolve({ id: '42' })).toBe('load-error');
    });

    it('answers load-error when the request fails without an HTTP response', () => {
        forumService.getTopic.mockReturnValue(throwError(() => new Error('Network error')));

        expect(resolve({ id: '42' })).toBe('load-error');
    });

    it('reports the failure that produced the load-error', () => {
        const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
        forumService.getTopic.mockReturnValue(throwError(() => failure));

        resolve({ id: '42' });

        // The error itself is the payload, so its stack reaches Sentry intact.
        expect(logger.error).toHaveBeenCalledWith('Failed to load the forum topic 42', failure);
    });
});
