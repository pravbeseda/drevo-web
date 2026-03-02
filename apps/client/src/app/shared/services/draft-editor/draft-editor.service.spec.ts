import { DraftEditorService } from './draft-editor.service';
import { DraftStorageService, LoggerService } from '@drevo-web/core';
import { MockDraftStorageService, mockDraftStorageProvider, mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('DraftEditorService', () => {
    let spectator: SpectatorService<DraftEditorService>;
    let draftStorage: MockDraftStorageService;
    let loggerService: MockLoggerService;

    const createService = createServiceFactory({
        service: DraftEditorService,
        providers: [mockDraftStorageProvider(), mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        draftStorage = spectator.inject(DraftStorageService) as unknown as MockDraftStorageService;
        loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
    });

    describe('getDraft', () => {
        it('should return undefined when no draft exists', async () => {
            draftStorage.getByRoute.mockResolvedValue(undefined);

            const result = await spectator.service.getDraft('/articles/123/version/456/edit');

            expect(result).toBeUndefined();
        });

        it('should return draft when it exists', async () => {
            const draft = { userId: 'u1', route: '/articles/123/version/456/edit', title: 'Test', text: 'Draft text', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);

            const result = await spectator.service.getDraft('/articles/123/version/456/edit');

            expect(result).toEqual(draft);
        });

        it('should catch errors and return undefined', async () => {
            draftStorage.getByRoute.mockRejectedValue(new Error('DB error'));

            const result = await spectator.service.getDraft('/articles/123/version/456/edit');

            expect(result).toBeUndefined();
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to get draft', expect.any(Error));
        });
    });

    describe('onContentChanged', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should debounce and save draft', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'v1' });
            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'v2' });
            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'v3' });

            jest.advanceTimersByTime(3000);

            expect(draftStorage.save).toHaveBeenCalledTimes(1);
            expect(draftStorage.save).toHaveBeenCalledWith({ route: '/articles/123/version/456/edit', title: 'Test', text: 'v3' });
        });

        it('should not save if text is same as last saved', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'same' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'same' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);
        });

        it('should not save after discardDraft is called', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'pending' });
            spectator.service.discardDraft('/articles/123/version/456/edit');
            jest.advanceTimersByTime(3000);

            expect(draftStorage.save).not.toHaveBeenCalled();
        });

        it('should resume saving after onContentChanged following discardDraft', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'before' });
            spectator.service.discardDraft('/articles/123/version/456/edit');
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).not.toHaveBeenCalled();

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'after' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);
            expect(draftStorage.save).toHaveBeenCalledWith({ route: '/articles/123/version/456/edit', title: 'Test', text: 'after' });
        });

        it('should save again if text changes after previous save', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'first' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'second' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(2);
        });
    });

    describe('discardDraft', () => {
        it('should delete draft by route', async () => {
            await spectator.service.discardDraft('/articles/123/version/456/edit');

            expect(draftStorage.deleteByRoute).toHaveBeenCalledWith('/articles/123/version/456/edit');
        });

        it('should catch errors and log them', async () => {
            draftStorage.deleteByRoute.mockRejectedValue(new Error('DB error'));

            await spectator.service.discardDraft('/articles/123/version/456/edit');

            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to discard draft', expect.any(Error));
        });
    });

    describe('flush', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should save pending input immediately', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'pending' });
            spectator.service.flush();

            expect(draftStorage.save).toHaveBeenCalledWith({ route: '/articles/123/version/456/edit', title: 'Test', text: 'pending' });
        });

        it('should not save when no pending input', () => {
            spectator.service.flush();

            expect(draftStorage.save).not.toHaveBeenCalled();
        });

        it('should not save when discarded', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'pending' });
            spectator.service.discardDraft('/articles/123/version/456/edit');
            spectator.service.flush();

            // Only deleteByRoute from discardDraft, no save
            expect(draftStorage.save).not.toHaveBeenCalled();
        });
    });

    describe('hasActiveSession', () => {
        it('should return false for unknown route', () => {
            expect(spectator.service.hasActiveSession('/articles/123/version/456/edit')).toBe(false);
        });

        it('should return true after onContentChanged', () => {
            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'x' });

            expect(spectator.service.hasActiveSession('/articles/123/version/456/edit')).toBe(true);
        });

        it('should return false after discardDraft', () => {
            spectator.service.onContentChanged({ route: '/articles/123/version/456/edit', title: 'Test', text: 'x' });
            spectator.service.discardDraft('/articles/123/version/456/edit');

            expect(spectator.service.hasActiveSession('/articles/123/version/456/edit')).toBe(false);
        });
    });
});
