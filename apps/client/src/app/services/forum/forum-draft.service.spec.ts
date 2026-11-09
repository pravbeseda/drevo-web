import { FORUM_DRAFT_SAVE_DEBOUNCE_MS, ForumDraftService } from './forum-draft.service';
import { AuthService } from '../auth/auth.service';
import { Draft, DraftStorageService } from '@drevo-web/core';
import { MockDraftStorageService, mockLoggerProvider } from '@drevo-web/core/testing';
import { User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { BehaviorSubject } from 'rxjs';

function createDraft(route: string, text: string): Draft {
    return { userId: 'reader', route, title: '', text, time: 0 };
}

describe('ForumDraftService', () => {
    let spectator: SpectatorService<ForumDraftService>;
    let storage: MockDraftStorageService;
    let user: BehaviorSubject<User | undefined>;

    const createService = createServiceFactory({
        service: ForumDraftService,
        providers: [mockLoggerProvider()],
    });

    /** Lets the storage promises the service awaits settle. */
    const flushPromises = async (): Promise<void> => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    };

    const setUp = async (stored: readonly Draft[] | Error = []): Promise<void> => {
        storage = new MockDraftStorageService();
        if (stored instanceof Error) {
            storage.getAll.mockRejectedValue(stored);
        } else {
            storage.getAll.mockResolvedValue([...stored]);
        }
        user = new BehaviorSubject<User | undefined>(createMockUser({ login: 'reader' }));
        spectator = createService({
            providers: [
                { provide: DraftStorageService, useValue: storage },
                { provide: AuthService, useValue: { user$: user.asObservable() } },
            ],
        });
        await flushPromises();
    };

    afterEach(() => jest.useRealTimers());

    describe('drafts', () => {
        it('holds the stored forum drafts by topic, leaving out drafts of other pages', async () => {
            await setUp([createDraft('/forum/topic/7', 'Ответ'), createDraft('/articles/3/version/4/edit', 'Статья')]);

            expect(spectator.service.drafts()).toEqual(new Map([[7, 'Ответ']]));
        });

        it('forgets the drafts once the reader logs out', async () => {
            await setUp([createDraft('/forum/topic/7', 'Ответ')]);

            user.next(undefined);
            await flushPromises();

            expect(spectator.service.drafts().size).toBe(0);
        });

        it('stays empty when the storage fails', async () => {
            await setUp(new Error('blocked'));

            expect(spectator.service.drafts().size).toBe(0);
        });
    });

    describe('get', () => {
        it('reads the draft of one topic', async () => {
            await setUp();
            storage.getByRoute.mockResolvedValue(createDraft('/forum/topic/7', 'Ответ'));

            await expect(spectator.service.get(7)).resolves.toBe('Ответ');
            expect(storage.getByRoute).toHaveBeenCalledWith('/forum/topic/7');
        });

        it('reads nothing when the storage fails', async () => {
            await setUp();
            storage.getByRoute.mockRejectedValue(new Error('blocked'));

            await expect(spectator.service.get(7)).resolves.toBeUndefined();
        });
    });

    describe('save', () => {
        it('stores the text and marks the topic as having a draft', async () => {
            await setUp();

            await spectator.service.save(7, 'Ответ');

            expect(storage.save).toHaveBeenCalledWith({ route: '/forum/topic/7', title: '', text: 'Ответ' });
            expect(spectator.service.drafts().get(7)).toBe('Ответ');
        });

        it('deletes the draft of a topic left with a blank field', async () => {
            await setUp([createDraft('/forum/topic/7', 'Ответ')]);

            await spectator.service.save(7, '  \n');

            expect(storage.deleteByRoute).toHaveBeenCalledWith('/forum/topic/7');
            expect(spectator.service.drafts().has(7)).toBe(false);
        });

        it('writes nothing when the text is what is already stored', async () => {
            await setUp([createDraft('/forum/topic/7', 'Ответ')]);

            await spectator.service.save(7, 'Ответ');

            expect(storage.save).not.toHaveBeenCalled();
        });

        it('deletes the draft of a blank field even before the drafts have loaded', async () => {
            storage = new MockDraftStorageService();
            storage.getAll.mockReturnValue(new Promise<never>(() => undefined));
            spectator = createService({
                providers: [
                    { provide: DraftStorageService, useValue: storage },
                    { provide: AuthService, useValue: { user$: new BehaviorSubject(createMockUser()) } },
                ],
            });

            await spectator.service.save(7, '');

            expect(storage.deleteByRoute).toHaveBeenCalledWith('/forum/topic/7');
        });

        it('applies the writes in the order they were asked for', async () => {
            await setUp();

            void spectator.service.save(7, 'Ответ');
            await spectator.service.save(7, '');

            expect(storage.deleteByRoute).toHaveBeenCalledWith('/forum/topic/7');
            expect(spectator.service.drafts().has(7)).toBe(false);
        });

        it('keeps the reply typed before the session ended, without marking the topic', async () => {
            await setUp([createDraft('/forum/topic/7', 'Ответ')]);
            user.next(undefined);

            await spectator.service.save(7, 'Новый ответ');
            await spectator.service.save(8, '');

            expect(storage.save).toHaveBeenCalledWith({ route: '/forum/topic/7', title: '', text: 'Новый ответ' });
            expect(storage.deleteByRoute).toHaveBeenCalledWith('/forum/topic/8');
            expect(spectator.service.drafts().size).toBe(0);
        });

        it('keeps the topic unmarked when the storage fails', async () => {
            await setUp();
            storage.save.mockRejectedValue(new Error('quota'));

            await spectator.service.save(7, 'Ответ');

            expect(spectator.service.drafts().has(7)).toBe(false);
        });
    });

    describe('discardSent', () => {
        const ROUTE = '/forum/topic/7';

        it('deletes the draft that still holds the sent text', async () => {
            await setUp([createDraft(ROUTE, 'Ответ')]);
            storage.getByRoute.mockResolvedValue(createDraft(ROUTE, 'Ответ'));

            await spectator.service.discardSent(7, 'Ответ');

            expect(storage.deleteByRoute).toHaveBeenCalledWith(ROUTE);
            expect(spectator.service.drafts().has(7)).toBe(false);
        });

        it('keeps a draft the reader has written on since', async () => {
            await setUp([createDraft(ROUTE, 'Ответ. P.S.')]);
            storage.getByRoute.mockResolvedValue(createDraft(ROUTE, 'Ответ. P.S.'));

            await spectator.service.discardSent(7, 'Ответ');

            expect(storage.deleteByRoute).not.toHaveBeenCalled();
            expect(spectator.service.drafts().get(7)).toBe('Ответ. P.S.');
        });

        it('compares against a write still queued when the reply went out', async () => {
            await setUp();
            storage.getByRoute.mockResolvedValue(createDraft(ROUTE, 'Ответ'));
            storage.save.mockImplementation(({ route, text }: Pick<Draft, 'route' | 'text'>) => {
                storage.getByRoute.mockResolvedValue(createDraft(route, text));
                return Promise.resolve();
            });

            void spectator.service.save(7, 'Ответ. P.S.');
            await spectator.service.discardSent(7, 'Ответ');

            expect(storage.deleteByRoute).not.toHaveBeenCalled();
        });

        it('drops a pending edit that is the sent text', async () => {
            await setUp();
            jest.useFakeTimers();

            spectator.service.edit(7, 'Ответ');
            await spectator.service.discardSent(7, 'Ответ');
            jest.advanceTimersByTime(FORUM_DRAFT_SAVE_DEBOUNCE_MS);
            await flushPromises();

            expect(storage.save).not.toHaveBeenCalled();
        });

        it('deletes an older stored copy when the last edit is what went out', async () => {
            await setUp([createDraft(ROUTE, 'Отв')]);
            storage.getByRoute.mockResolvedValue(createDraft(ROUTE, 'Отв'));
            jest.useFakeTimers();

            spectator.service.edit(7, 'Ответ');
            await spectator.service.discardSent(7, 'Ответ');

            expect(storage.deleteByRoute).toHaveBeenCalledWith(ROUTE);
            expect(spectator.service.drafts().has(7)).toBe(false);
        });

        it('lets a newer pending edit reach the storage', async () => {
            await setUp();
            storage.getByRoute.mockResolvedValue(createDraft(ROUTE, 'Ответ'));
            jest.useFakeTimers();

            spectator.service.edit(7, 'Ответ. P.S.');
            await spectator.service.discardSent(7, 'Ответ');
            jest.advanceTimersByTime(FORUM_DRAFT_SAVE_DEBOUNCE_MS);
            await flushPromises();

            expect(storage.deleteByRoute).not.toHaveBeenCalled();
            expect(storage.save).toHaveBeenCalledWith({ route: ROUTE, title: '', text: 'Ответ. P.S.' });
        });

        it('leaves the draft in place when it cannot be read', async () => {
            await setUp();
            storage.getByRoute.mockRejectedValue(new Error('blocked'));

            await spectator.service.discardSent(7, 'Ответ');

            expect(storage.deleteByRoute).not.toHaveBeenCalled();
        });
    });

    describe('edit', () => {
        it('stores the text once the reader pauses', async () => {
            await setUp();
            jest.useFakeTimers();

            spectator.service.edit(7, 'От');
            spectator.service.edit(7, 'Ответ');
            jest.advanceTimersByTime(FORUM_DRAFT_SAVE_DEBOUNCE_MS - 1);
            expect(storage.save).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            await flushPromises();

            expect(storage.save).toHaveBeenCalledTimes(1);
            expect(storage.save).toHaveBeenCalledWith({ route: '/forum/topic/7', title: '', text: 'Ответ' });
        });

        it('drops the pending text once the topic is saved at once', async () => {
            await setUp();
            jest.useFakeTimers();

            spectator.service.edit(7, 'Ответ');
            await spectator.service.save(7, '');
            jest.advanceTimersByTime(FORUM_DRAFT_SAVE_DEBOUNCE_MS);
            await flushPromises();

            expect(storage.save).not.toHaveBeenCalled();
        });

        it('stores the pending text of one topic before an edit of another', async () => {
            await setUp();
            jest.useFakeTimers();

            spectator.service.edit(7, 'Первый');
            spectator.service.edit(8, 'Второй');
            await flushPromises();

            expect(storage.save).toHaveBeenCalledWith({ route: '/forum/topic/7', title: '', text: 'Первый' });
        });
    });
});
