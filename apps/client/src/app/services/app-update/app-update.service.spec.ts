import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
    let spectator: SpectatorService<AppUpdateService>;
    const reload = jest.fn();
    const windowMock = { location: { reload } } as unknown as Window;

    const createService = createServiceFactory({
        service: AppUpdateService,
        providers: [mockLoggerProvider(), { provide: WINDOW, useValue: windowMock }],
    });

    beforeEach(() => {
        reload.mockClear();
        spectator = createService();
    });

    it('should be created with chunkLoadFailed = false', () => {
        expect(spectator.service.chunkLoadFailed()).toBe(false);
    });

    it('should set chunkLoadFailed to true and log on first notifyChunkLoadFailure', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
        const error = new Error('Loading chunk 1 failed');

        spectator.service.notifyChunkLoadFailure(error, { url: '/profile' });

        expect(spectator.service.chunkLoadFailed()).toBe(true);
        expect(logger.mockLogger.error).toHaveBeenCalledWith('Chunk load failure — reload prompt shown', {
            error,
            url: '/profile',
        });
    });

    it('should be idempotent: second notify does not log again', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

        spectator.service.notifyChunkLoadFailure(new Error('a'), { url: '/a' });
        spectator.service.notifyChunkLoadFailure(new Error('b'), { url: '/b' });

        expect(logger.mockLogger.error).toHaveBeenCalledTimes(1);
        expect(spectator.service.chunkLoadFailed()).toBe(true);
    });

    it('reload() should log and call window.location.reload()', () => {
        const logger = spectator.inject(LoggerService) as unknown as MockLoggerService;

        spectator.service.reload();

        expect(logger.mockLogger.info).toHaveBeenCalledWith('User clicked reload after chunk load failure');
        expect(reload).toHaveBeenCalledTimes(1);
    });
});
