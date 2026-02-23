import { DraftEditorService } from './draft-editor.service';
import { Router } from '@angular/router';
import { DraftStorageService, LoggerService } from '@drevo-web/core';
import {
    MockDraftStorageService,
    mockDraftStorageProvider,
    mockLoggerProvider,
    MockLoggerService,
} from '@drevo-web/core/testing';
import { ConfirmationService } from '@drevo-web/ui';
import { createServiceFactory, mockProvider, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('DraftEditorService', () => {
    let spectator: SpectatorService<DraftEditorService>;
    let draftStorage: MockDraftStorageService;
    let confirmationService: ConfirmationService;
    let router: Router;
    let loggerService: MockLoggerService;

    const createService = createServiceFactory({
        service: DraftEditorService,
        providers: [
            mockDraftStorageProvider(),
            mockLoggerProvider(),
            mockProvider(ConfirmationService),
            mockProvider(Router),
        ],
    });

    beforeEach(() => {
        spectator = createService();
        draftStorage = spectator.inject(DraftStorageService) as unknown as MockDraftStorageService;
        confirmationService = spectator.inject(ConfirmationService);
        router = spectator.inject(Router);
        loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
    });

    describe('checkDraft', () => {
        it('should return undefined when no draft exists', async () => {
            draftStorage.getByRoute.mockResolvedValue(undefined);

            const result = await spectator.service.checkDraft('/articles/edit/1');

            expect(result).toBeUndefined();
            expect(confirmationService.open).not.toHaveBeenCalled();
        });

        it('should open confirmation dialog when draft found', async () => {
            const draft = { userId: 'u1', route: '/articles/edit/1', title: 'Test', text: 'Draft text', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);
            (confirmationService.open as jest.Mock).mockReturnValue(of('restore'));

            await spectator.service.checkDraft('/articles/edit/1');

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Найден черновик',
                    disableClose: true,
                }),
            );
        });

        it('should return draft text when user chooses restore', async () => {
            const draft = { userId: 'u1', route: '/articles/edit/1', title: 'Test', text: 'Draft text', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);
            (confirmationService.open as jest.Mock).mockReturnValue(of('restore'));

            const result = await spectator.service.checkDraft('/articles/edit/1');

            expect(result).toBe('Draft text');
            expect(draftStorage.deleteByRoute).not.toHaveBeenCalled();
        });

        it('should delete draft and return undefined when user declines', async () => {
            const draft = { userId: 'u1', route: '/articles/edit/1', title: 'Test', text: 'Draft text', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);
            (confirmationService.open as jest.Mock).mockReturnValue(of('discard'));

            const result = await spectator.service.checkDraft('/articles/edit/1');

            expect(result).toBeUndefined();
            expect(draftStorage.deleteByRoute).toHaveBeenCalledWith('/articles/edit/1');
        });

        it('should catch errors and return undefined', async () => {
            draftStorage.getByRoute.mockRejectedValue(new Error('DB error'));

            const result = await spectator.service.checkDraft('/articles/edit/1');

            expect(result).toBeUndefined();
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to check draft', expect.any(Error));
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

            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'v1' });
            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'v2' });
            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'v3' });

            jest.advanceTimersByTime(3000);

            expect(draftStorage.save).toHaveBeenCalledTimes(1);
            expect(draftStorage.save).toHaveBeenCalledWith({ route: '/articles/edit/1', title: 'Test', text: 'v3' });
        });

        it('should not save if text is same as last saved', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'same' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);

            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'same' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);
        });

        it('should save again if text changes after previous save', () => {
            draftStorage.save.mockResolvedValue(undefined);

            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'first' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(1);

            spectator.service.onContentChanged({ route: '/articles/edit/1', title: 'Test', text: 'second' });
            jest.advanceTimersByTime(3000);
            expect(draftStorage.save).toHaveBeenCalledTimes(2);
        });
    });

    describe('discardDraft', () => {
        it('should delete draft by route', async () => {
            await spectator.service.discardDraft('/articles/edit/1');

            expect(draftStorage.deleteByRoute).toHaveBeenCalledWith('/articles/edit/1');
        });

        it('should catch errors and log them', async () => {
            draftStorage.deleteByRoute.mockRejectedValue(new Error('DB error'));

            await spectator.service.discardDraft('/articles/edit/1');

            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to discard draft', expect.any(Error));
        });
    });

    describe('confirmDiscardAndNavigate', () => {
        it('should navigate immediately when no draft exists', async () => {
            draftStorage.getByRoute.mockResolvedValue(undefined);

            await spectator.service.confirmDiscardAndNavigate('/articles/edit/1', ['/articles', 1]);

            expect(confirmationService.open).not.toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/articles', 1]);
        });

        it('should show confirm dialog and navigate when user confirms', async () => {
            const draft = { userId: 'u1', route: '/articles/edit/1', title: 'Test', text: 'x', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);
            (confirmationService.open as jest.Mock).mockReturnValue(of('confirm'));

            await spectator.service.confirmDiscardAndNavigate('/articles/edit/1', ['/articles', 1]);

            expect(confirmationService.open).toHaveBeenCalledWith(
                expect.objectContaining({ disableClose: true }),
            );
            expect(draftStorage.deleteByRoute).toHaveBeenCalledWith('/articles/edit/1');
            expect(router.navigate).toHaveBeenCalledWith(['/articles', 1]);
        });

        it('should stay on page when user cancels', async () => {
            const draft = { userId: 'u1', route: '/articles/edit/1', title: 'Test', text: 'x', time: 1000 };
            draftStorage.getByRoute.mockResolvedValue(draft);
            (confirmationService.open as jest.Mock).mockReturnValue(of('cancel'));

            await spectator.service.confirmDiscardAndNavigate('/articles/edit/1', ['/articles', 1]);

            expect(draftStorage.deleteByRoute).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should catch errors and log them', async () => {
            draftStorage.getByRoute.mockRejectedValue(new Error('DB error'));

            await spectator.service.confirmDiscardAndNavigate('/articles/edit/1', ['/articles', 1]);

            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to confirm discard', expect.any(Error));
        });
    });
});
