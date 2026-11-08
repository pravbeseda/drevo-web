import { CountsApiService } from './counts-api.service';
import { CountsInvalidationService } from './counts-invalidation.service';
import { COUNTS_INVALIDATION_DEBOUNCE_MS, COUNTS_NAVIGATION_THROTTLE_MS, CountsService } from './counts.service';
import { AuthService } from '../auth/auth.service';
import { ForumService } from '../forum/forum.service';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { MockLogger, MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { HistoryCountsDto, User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

const moderator = createMockUser({
    login: 'moderator',
    permissions: { canEdit: true, canModerate: true, canAdmin: false },
});
const reader = createMockUser({
    login: 'reader',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
});
const pending: HistoryCountsDto = { pendingArticles: 3, pendingNews: 1, pendingPictures: 2 };

describe('CountsService', () => {
    let spectator: SpectatorService<CountsService>;
    let logger: MockLogger;
    let user: BehaviorSubject<User | undefined>;
    let routerEvents: Subject<unknown>;
    const countsApi = { getHistoryCounts: jest.fn() };
    const forum = { getUnreadCount: jest.fn() };

    const createService = createServiceFactory({
        service: CountsService,
        providers: [mockLoggerProvider()],
    });

    function start(initialUser: User | undefined): void {
        user = new BehaviorSubject<User | undefined>(initialUser);
        routerEvents = new Subject<unknown>();
        spectator = createService({
            providers: [
                { provide: AuthService, useValue: { user$: user.asObservable() } },
                { provide: Router, useValue: { events: routerEvents.asObservable() } },
                { provide: CountsApiService, useValue: countsApi },
                { provide: ForumService, useValue: forum },
            ],
        });
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    }

    function navigate(): void {
        routerEvents.next(new NavigationEnd(1, '/a', '/a'));
    }

    beforeEach(() => {
        jest.useFakeTimers();
        countsApi.getHistoryCounts.mockReset().mockReturnValue(of(pending));
        forum.getUnreadCount.mockReset().mockReturnValue(of(7));
    });

    afterEach(() => jest.useRealTimers());

    describe('who gets which count', () => {
        it('should request nothing for a guest and report nothing', () => {
            start(undefined);

            expect(countsApi.getHistoryCounts).not.toHaveBeenCalled();
            expect(forum.getUnreadCount).not.toHaveBeenCalled();
            expect(spectator.service.historyCounts()).toBeUndefined();
            expect(spectator.service.pendingTotal()).toBe(0);
            expect(spectator.service.forumUnread()).toBe(0);
        });

        it('should give a reader the forum count and keep the moderation queue from them', () => {
            start(reader);

            expect(countsApi.getHistoryCounts).not.toHaveBeenCalled();
            expect(spectator.service.forumUnread()).toBe(7);
            expect(spectator.service.historyCounts()).toBeUndefined();
        });

        it('should give a moderator both, with the pending items summed', () => {
            start(moderator);

            expect(spectator.service.forumUnread()).toBe(7);
            expect(spectator.service.historyCounts()).toEqual(pending);
            expect(spectator.service.pendingTotal()).toBe(6);
        });
    });

    describe('navigation', () => {
        it('should not reload on a navigation within the interval of the first load', () => {
            start(reader);

            navigate();
            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS - 1);
            navigate();

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(1);
        });

        it('should reload on the first navigation past the interval', () => {
            start(reader);
            forum.getUnreadCount.mockReturnValue(of(9));

            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS);
            navigate();

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(2);
            expect(spectator.service.forumUnread()).toBe(9);
        });

        it('should not reload by itself while nobody navigates', () => {
            start(reader);

            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS * 3);

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(1);
        });

        it('should ignore router events other than a finished navigation', () => {
            start(reader);
            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS);

            routerEvents.next(new NavigationStart(2, '/b'));

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalidation', () => {
        it('should reload once the invalidations pause, inside the navigation interval', () => {
            start(reader);
            const invalidation = spectator.inject(CountsInvalidationService);
            forum.getUnreadCount.mockReturnValue(of(4));

            invalidation.invalidate();
            jest.advanceTimersByTime(COUNTS_INVALIDATION_DEBOUNCE_MS - 1);
            invalidation.invalidate();
            jest.advanceTimersByTime(COUNTS_INVALIDATION_DEBOUNCE_MS);

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(2);
            expect(spectator.service.forumUnread()).toBe(4);
        });
    });

    describe('the reader changes', () => {
        it('should clear the counts and stop reloading once the reader leaves', () => {
            start(moderator);

            user.next(undefined);
            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS);
            navigate();

            expect(spectator.service.historyCounts()).toBeUndefined();
            expect(spectator.service.forumUnread()).toBe(0);
            expect(forum.getUnreadCount).toHaveBeenCalledTimes(1);
        });

        it('should not reload when the same reader is announced again', () => {
            start(reader);

            user.next({ ...reader });

            expect(forum.getUnreadCount).toHaveBeenCalledTimes(1);
        });

        it('should drop an answer that arrives after the reader left', () => {
            const answer = new Subject<number>();
            forum.getUnreadCount.mockReturnValue(answer);
            start(reader);

            user.next(undefined);
            answer.next(5);

            expect(spectator.service.forumUnread()).toBe(0);
        });
    });

    describe('failures', () => {
        it('should log a failed count, keep the other one and go on reloading', () => {
            const error = new Error('offline');
            countsApi.getHistoryCounts.mockReturnValueOnce(throwError(() => error));
            start(moderator);

            expect(logger.error).toHaveBeenCalledWith('Failed to load history counts', error);
            expect(spectator.service.forumUnread()).toBe(7);

            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS);
            navigate();

            expect(spectator.service.historyCounts()).toEqual(pending);
        });

        it('should keep the last known forum count when a reload fails', () => {
            const error = new Error('offline');
            start(reader);
            forum.getUnreadCount.mockReturnValue(throwError(() => error));

            jest.advanceTimersByTime(COUNTS_NAVIGATION_THROTTLE_MS);
            navigate();

            expect(logger.error).toHaveBeenCalledWith('Failed to load forum unread count', error);
            expect(spectator.service.forumUnread()).toBe(7);
        });
    });
});
