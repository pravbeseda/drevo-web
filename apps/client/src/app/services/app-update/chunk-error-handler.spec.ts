import { AppUpdateService } from './app-update.service';
import { ChunkErrorHandler, DELEGATE_ERROR_HANDLER } from './chunk-error-handler';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('ChunkErrorHandler', () => {
    let spectator: SpectatorService<ChunkErrorHandler>;
    let appUpdateService: jest.Mocked<AppUpdateService>;
    let logger: MockLoggerService['mockLogger'];

    const windowMock = {
        location: { pathname: '/profile', search: '?id=1' },
    } as unknown as Window;

    const createService = createServiceFactory({
        service: ChunkErrorHandler,
        mocks: [AppUpdateService],
        providers: [{ provide: WINDOW, useValue: windowMock }, mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        appUpdateService = spectator.inject(AppUpdateService);
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    });

    it('notifies AppUpdateService and logs chunk load errors', () => {
        const error = new Error('Loading chunk 5 failed');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).toHaveBeenCalledWith(error, {
            url: '/profile?id=1',
            source: 'error-handler',
        });
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error);
    });

    it('only logs non-chunk errors', () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error);
    });
});

describe('ChunkErrorHandler with a delegate error handler', () => {
    let spectator: SpectatorService<ChunkErrorHandler>;
    let logger: MockLoggerService['mockLogger'];
    const delegate = { handleError: jest.fn() };

    const createService = createServiceFactory({
        service: ChunkErrorHandler,
        mocks: [AppUpdateService],
        providers: [
            { provide: WINDOW, useValue: { location: { pathname: '/', search: '' } } },
            { provide: DELEGATE_ERROR_HANDLER, useValue: delegate },
            mockLoggerProvider(),
        ],
    });

    beforeEach(() => {
        spectator = createService();
        delegate.handleError.mockClear();
        logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
    });

    it('notifies AppUpdateService and hands chunk load errors to the delegate', () => {
        const error = new Error('Loading chunk 5 failed');

        spectator.service.handleError(error);

        expect(spectator.inject(AppUpdateService).notifyChunkLoadFailure).toHaveBeenCalled();
        expect(delegate.handleError).toHaveBeenCalledWith(error);
    });

    it('hands the error to the delegate before logging it, so Sentry keeps its unhandled-error event', () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(delegate.handleError).toHaveBeenCalledWith(error);
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error);
        expect(delegate.handleError.mock.invocationCallOrder[0]).toBeLessThan(logger.error.mock.invocationCallOrder[0]);
    });
});
