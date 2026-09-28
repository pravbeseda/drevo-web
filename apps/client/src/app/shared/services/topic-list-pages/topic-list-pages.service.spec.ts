import { TopicListPagesService } from './topic-list-pages.service';
import { LoggerService } from '@drevo-web/core';
import { MockLogger, MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { Subject, of, throwError } from 'rxjs';

function createItem(id: number): ForumTopicListItem {
    return {
        id,
        title: `Тема ${id}`,
        lastPostAt: undefined,
        pinned: false,
        author: 'Иванов И.И.',
        article: undefined,
        section: undefined,
    };
}

function createPage(page: number, ids: readonly number[], totalPages = 3): ForumTopicListResponse {
    return { items: ids.map(createItem), total: totalPages * ids.length, page, pageSize: ids.length, totalPages };
}

describe('TopicListPagesService', () => {
    let spectator: SpectatorService<TopicListPagesService>;
    let fetchPage: jest.Mock;
    let logger: MockLogger;

    const createService = createServiceFactory({
        service: TopicListPagesService,
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
        fetchPage = jest.fn().mockReturnValue(of(createPage(2, [2])));
    });

    const ids = (): number[] => spectator.service.items().map(item => item.id);

    it('holds the first page it is given', () => {
        spectator.service.reset(createPage(1, [1]), fetchPage);

        expect(ids()).toEqual([1]);
        expect(spectator.service.total()).toBe(3);
        expect(spectator.service.loadState()).toBe('idle');
        expect(fetchPage).not.toHaveBeenCalled();
    });

    it('appends the next page below the loaded ones', () => {
        spectator.service.reset(createPage(1, [1]), fetchPage);

        spectator.service.loadMore();

        expect(fetchPage).toHaveBeenCalledWith(2);
        expect(ids()).toEqual([1, 2]);
        expect(spectator.service.loadState()).toBe('idle');
    });

    it('asks for nothing past the last page', () => {
        spectator.service.reset(createPage(3, [1]), fetchPage);

        spectator.service.loadMore();

        expect(fetchPage).not.toHaveBeenCalled();
    });

    it('asks for one page at a time', () => {
        fetchPage.mockReturnValue(new Subject<ForumTopicListResponse>());
        spectator.service.reset(createPage(1, [1]), fetchPage);

        spectator.service.loadMore();
        spectator.service.loadMore();

        expect(fetchPage).toHaveBeenCalledTimes(1);
        expect(spectator.service.loadState()).toBe('loading');
    });

    describe('a failed page', () => {
        beforeEach(() => {
            fetchPage.mockReturnValue(throwError(() => new Error('Network error')));
            spectator.service.reset(createPage(1, [1]), fetchPage);
            spectator.service.loadMore();
        });

        it('keeps the loaded rows and reports the failure', () => {
            expect(ids()).toEqual([1]);
            expect(spectator.service.loadState()).toBe('failed');
            expect(logger.error).toHaveBeenCalledWith('Failed to load more forum topics', expect.any(Error));
        });

        /** The end of the list is still on screen, so loading on sight would retry in a loop. */
        it('waits for the reader to retry', () => {
            fetchPage.mockClear();

            spectator.service.loadMore();

            expect(fetchPage).not.toHaveBeenCalled();
        });

        it('loads the same page again on retry', () => {
            fetchPage.mockReturnValue(of(createPage(2, [2])));

            spectator.service.retry();

            expect(fetchPage).toHaveBeenLastCalledWith(2);
            expect(ids()).toEqual([1, 2]);
            expect(spectator.service.loadState()).toBe('idle');
        });
    });

    /** A reused list — another section, another article — must not take a page of the previous one. */
    it('drops a page still in flight when it starts over', () => {
        const inFlight = new Subject<ForumTopicListResponse>();
        fetchPage.mockReturnValue(inFlight);
        spectator.service.reset(createPage(1, [1]), fetchPage);
        spectator.service.loadMore();

        spectator.service.reset(createPage(1, [9]), fetchPage);
        inFlight.next(createPage(2, [2]));

        expect(ids()).toEqual([9]);
        expect(spectator.service.loadState()).toBe('idle');
    });

    it('pages through the list it started over with', () => {
        const nextFetch = jest.fn().mockReturnValue(of(createPage(2, [10])));
        spectator.service.reset(createPage(1, [1]), fetchPage);

        spectator.service.reset(createPage(1, [9]), nextFetch);
        spectator.service.loadMore();

        expect(fetchPage).not.toHaveBeenCalled();
        expect(ids()).toEqual([9, 10]);
    });

    it('empties the list when it starts over without a page', () => {
        spectator.service.reset(createPage(1, [1]), fetchPage);

        spectator.service.reset(undefined, fetchPage);
        spectator.service.loadMore();

        expect(ids()).toEqual([]);
        expect(spectator.service.total()).toBe(0);
        expect(fetchPage).not.toHaveBeenCalled();
    });

    describe('reload', () => {
        it('loads the first page again and starts the list over from it — a new topic heads it', () => {
            spectator.service.reset(createPage(1, [1]), fetchPage);
            spectator.service.loadMore();
            fetchPage.mockReturnValue(of(createPage(1, [9, 1])));

            spectator.service.reload();

            expect(fetchPage).toHaveBeenLastCalledWith(1);
            expect(ids()).toEqual([9, 1]);

            fetchPage.mockReturnValue(of(createPage(2, [2])));
            spectator.service.loadMore();
            expect(ids()).toEqual([9, 1, 2]);
        });

        it('keeps the list it has when the first page fails to load', () => {
            spectator.service.reset(createPage(1, [1]), fetchPage);
            fetchPage.mockReturnValue(throwError(() => new Error('offline')));

            spectator.service.reload();

            expect(ids()).toEqual([1]);
            expect(logger.error).toHaveBeenCalled();
        });

        it('does nothing before there is a list', () => {
            spectator.service.reload();

            expect(fetchPage).not.toHaveBeenCalled();
        });
    });
});
