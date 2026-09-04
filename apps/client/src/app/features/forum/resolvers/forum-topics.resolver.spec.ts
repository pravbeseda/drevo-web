import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { resolveForumTopics } from './forum-topics.resolver';
import { ForumService } from '../../../services/forum/forum.service';
import { HttpErrorResponse } from '@angular/common/http';
import { UrlSegment } from '@angular/router';
import { Logger } from '@drevo-web/core';
import { ForumTopicListResponse } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

describe('resolveForumTopics', () => {
    const topics: ForumTopicListResponse = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

    let forumService: jest.Mocked<Pick<ForumService, 'getTopics'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    beforeEach(() => {
        forumService = { getTopics: jest.fn().mockReturnValue(of(topics)) };
        logger = { error: jest.fn() };
    });

    const resolve = (
        params: Record<string, string>,
        queryParams: Record<string, string> = {},
        segments?: UrlSegment[],
    ): unknown => {
        let result: unknown;
        resolveForumTopics(
            forumService as unknown as ForumService,
            logger as unknown as Logger,
            createRouteSnapshot(params, segments, queryParams),
        ).subscribe(value => (result = value));
        return result;
    };

    it('loads every section when the address names none', () => {
        expect(resolve({})).toBe(topics);
        expect(forumService.getTopics).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('loads the section the address names', () => {
        resolve({ part: 'common' });

        expect(forumService.getTopics).toHaveBeenCalledWith('common', undefined, undefined);
    });

    it('loads the section bound to the id the address names', () => {
        resolve({ part: 'articles', partId: '42' });

        expect(forumService.getTopics).toHaveBeenCalledWith('articles', 42, undefined);
    });

    it('reads the page from the query', () => {
        resolve({ part: 'common' }, { page: '3' });

        expect(forumService.getTopics).toHaveBeenCalledWith('common', undefined, 3);
    });

    it.each([
        ['not a number', 'abc'],
        ['zero', '0'],
        ['negative', '-1'],
        ['fractional', '1.5'],
    ])('asks for the first page when the query page is %s', (_case, page) => {
        resolve({ part: 'common' }, { page });

        expect(forumService.getTopics).toHaveBeenCalledWith('common', undefined, undefined);
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
        ['padded with a leading zero', '042'],
    ])('answers not-found for a partId %s, without asking the API', (_case, partId) => {
        expect(resolve({ part: 'articles', partId })).toBe('not-found');
        expect(forumService.getTopics).not.toHaveBeenCalled();
    });

    it('answers not-found when the section segment carries matrix params, without asking the API', () => {
        // `/forum/common;part=hidden` — Angular merges the matrix param over the
        // positional one, so the paramMap names a section the address does not.
        expect(resolve({ part: 'hidden' }, {}, [new UrlSegment('common', { part: 'hidden' })])).toBe('not-found');
        expect(forumService.getTopics).not.toHaveBeenCalled();
    });

    it('answers not-found when the API answers 404', () => {
        forumService.getTopics.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
        );

        expect(resolve({ part: 'common' })).toBe('not-found');
        expect(logger.error).not.toHaveBeenCalled();
    });

    /**
     * The backend answers 400 INVALID_PART for a section id that is not in the
     * table. To the reader that address is a page that is not there.
     */
    it('answers not-found when the API rejects the section as unknown', () => {
        forumService.getTopics.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
        );

        expect(resolve({ part: 'nowhere' })).toBe('not-found');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('answers load-error when the request fails for any other reason', () => {
        forumService.getTopics.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
        );

        expect(resolve({ part: 'common' })).toBe('load-error');
    });

    it('answers load-error when the request fails without an HTTP response', () => {
        forumService.getTopics.mockReturnValue(throwError(() => new Error('Network error')));

        expect(resolve({ part: 'common' })).toBe('load-error');
    });

    it('reports the failure that produced the load-error', () => {
        const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
        forumService.getTopics.mockReturnValue(throwError(() => failure));

        resolve({ part: 'common' });

        // The error itself is the payload, so its stack reaches Sentry intact.
        expect(logger.error).toHaveBeenCalledWith('Failed to load the forum topics', failure);
    });
});
