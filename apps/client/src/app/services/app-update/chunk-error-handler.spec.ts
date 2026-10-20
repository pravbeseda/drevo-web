import { AppUpdateService } from './app-update.service';
import { ChunkErrorHandler, DELEGATE_ERROR_HANDLER } from './chunk-error-handler';
import { ErrorHandler } from '@angular/core';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('ChunkErrorHandler', () => {
    let spectator: SpectatorService<ChunkErrorHandler>;
    let appUpdateService: jest.Mocked<AppUpdateService>;
    let logger: MockLoggerService['mockLogger'];
    let angularHandleSpy: jest.SpyInstance;

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
        angularHandleSpy = jest.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);
    });

    afterEach(() => {
        angularHandleSpy.mockRestore();
    });

    it('notifies AppUpdateService and logs chunk load errors', () => {
        const error = new Error('Loading chunk 5 failed');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).toHaveBeenCalledWith(error, {
            url: '/profile?id=1',
            source: 'error-handler',
        });
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, { alreadyReported: true });
    });

    it("reports through Angular's own ErrorHandler when no delegate is provided, and only records it in the log", () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).not.toHaveBeenCalled();
        expect(angularHandleSpy).toHaveBeenCalledWith(error);
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, { alreadyReported: true });
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

    it('records the error as already reported, so the console and Sentry get it from the delegate alone', () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(delegate.handleError).toHaveBeenCalledWith(error);
        expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, { alreadyReported: true });
    });
});
