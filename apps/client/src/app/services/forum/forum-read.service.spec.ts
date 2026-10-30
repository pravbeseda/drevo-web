import { FORUM_MARK_READ_DEBOUNCE_MS, ForumReadService } from './forum-read.service';
import { ForumService } from './forum.service';
import { AuthService } from '../auth/auth.service';
import { LoggerService } from '@drevo-web/core';
import { MockLogger, MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('ForumReadService', () => {
    let spectator: SpectatorService<ForumReadService>;
    let forumService: jest.Mocked<ForumService>;
    let logger: MockLogger;
    let user: BehaviorSubject<User | undefined>;

    const createService = createServiceFactory({
        service: ForumReadService,
        mocks: [ForumService],
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        jest.useFakeTimers();
        user = new BehaviorSubject<User | undefined>(createMockUser({ login: 'reader' }));
        spectator = createService({
            providers: [{ provide: AuthService, useValue: { user$: user.asObservable() } }],
        });
        forumService = spectator.inject(ForumService);
        forumService.markRead.mockReturnValue(of({ unreadCount: 0, firstUnreadId: undefined }));
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    });

    afterEach(() => jest.useRealTimers());

    it('should report the largest message seen once the reading pauses', () => {
        spectator.service.markSeen(42, 7);
        spectator.service.markSeen(42, 9);
        spectator.service.markSeen(42, 8);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS - 1);

        expect(forumService.markRead).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);

        expect(forumService.markRead).toHaveBeenCalledTimes(1);
        expect(forumService.markRead).toHaveBeenCalledWith(42, 9);
    });

    it('should not report a message again, nor one below it', () => {
        spectator.service.markSeen(42, 9);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);
        spectator.service.markSeen(42, 9);
        spectator.service.markSeen(42, 5);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        expect(forumService.markRead).toHaveBeenCalledTimes(1);
    });

    it('should report each topic on its own', () => {
        spectator.service.markSeen(42, 9);
        spectator.service.markSeen(43, 3);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        expect(forumService.markRead).toHaveBeenCalledWith(42, 9);
        expect(forumService.markRead).toHaveBeenCalledWith(43, 3);
    });

    it('should keep what the server says is left unread, by topic', () => {
        forumService.markRead.mockReturnValue(of({ unreadCount: 2, firstUnreadId: 10 }));

        spectator.service.markSeen(42, 9);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        expect(spectator.service.states().get(42)).toEqual({ unreadCount: 2, firstUnreadId: 10 });
    });

    it('should log a failed report and go on reporting', () => {
        const error = new Error('offline');
        forumService.markRead.mockReturnValueOnce(throwError(() => error));

        spectator.service.markSeen(42, 9);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);
        spectator.service.markSeen(42, 10);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        expect(logger.error).toHaveBeenCalledWith('Failed to mark forum topic 42 read up to message 9', error);
        expect(forumService.markRead).toHaveBeenLastCalledWith(42, 10);
        expect(spectator.service.states().get(42)).toEqual({ unreadCount: 0, firstUnreadId: undefined });
    });

    it('should drop the states of the topics it is told to forget', () => {
        spectator.service.markSeen(42, 9);
        spectator.service.markSeen(43, 3);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        spectator.service.forget([42]);

        expect([...spectator.service.states().keys()]).toEqual([43]);
    });

    it('should drop every state when another reader signs in', () => {
        spectator.service.markSeen(42, 9);
        jest.advanceTimersByTime(FORUM_MARK_READ_DEBOUNCE_MS);

        user.next(createMockUser({ login: 'other' }));

        expect(spectator.service.states().size).toBe(0);
    });
});
