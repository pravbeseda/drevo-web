import { AppUpdateService } from './app-update.service';
import { ChunkErrorHandler, DELEGATE_ERROR_HANDLER } from './chunk-error-handler';
import { ErrorHandler } from '@angular/core';
import { WINDOW } from '@drevo-web/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('ChunkErrorHandler', () => {
    let spectator: SpectatorService<ChunkErrorHandler>;
    let appUpdateService: jest.Mocked<AppUpdateService>;
    let superHandleSpy: jest.SpyInstance;

    const windowMock = {
        location: { pathname: '/profile', search: '?id=1' },
    } as unknown as Window;

    const createService = createServiceFactory({
        service: ChunkErrorHandler,
        mocks: [AppUpdateService],
        providers: [{ provide: WINDOW, useValue: windowMock }],
    });

    beforeEach(() => {
        spectator = createService();
        appUpdateService = spectator.inject(AppUpdateService);
        superHandleSpy = jest.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);
    });

    afterEach(() => {
        superHandleSpy.mockRestore();
    });

    it('notifies AppUpdateService and delegates to super on chunk load errors', () => {
        const error = new Error('Loading chunk 5 failed');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).toHaveBeenCalledWith(error, {
            url: '/profile?id=1',
            source: 'error-handler',
        });
        expect(superHandleSpy).toHaveBeenCalledWith(error);
    });

    it('only delegates to super on non-chunk errors', () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(appUpdateService.notifyChunkLoadFailure).not.toHaveBeenCalled();
        expect(superHandleSpy).toHaveBeenCalledWith(error);
    });
});

describe('ChunkErrorHandler with a delegate error handler', () => {
    let spectator: SpectatorService<ChunkErrorHandler>;
    let superHandleSpy: jest.SpyInstance;
    const delegate = { handleError: jest.fn() };

    const createService = createServiceFactory({
        service: ChunkErrorHandler,
        mocks: [AppUpdateService],
        providers: [
            { provide: WINDOW, useValue: { location: { pathname: '/', search: '' } } },
            { provide: DELEGATE_ERROR_HANDLER, useValue: delegate },
        ],
    });

    beforeEach(() => {
        spectator = createService();
        delegate.handleError.mockClear();
        superHandleSpy = jest.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);
    });

    afterEach(() => {
        superHandleSpy.mockRestore();
    });

    it('notifies AppUpdateService and hands chunk load errors to the delegate instead of super', () => {
        const error = new Error('Loading chunk 5 failed');

        spectator.service.handleError(error);

        expect(spectator.inject(AppUpdateService).notifyChunkLoadFailure).toHaveBeenCalled();
        expect(delegate.handleError).toHaveBeenCalledWith(error);
        expect(superHandleSpy).not.toHaveBeenCalled();
    });

    it('hands other errors to the delegate instead of super', () => {
        const error = new TypeError('something else');

        spectator.service.handleError(error);

        expect(delegate.handleError).toHaveBeenCalledWith(error);
        expect(superHandleSpy).not.toHaveBeenCalled();
    });
});
