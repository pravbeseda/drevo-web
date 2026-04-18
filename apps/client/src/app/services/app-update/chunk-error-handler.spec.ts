import { ErrorHandler } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { WINDOW } from '@drevo-web/core';
import { AppUpdateService } from './app-update.service';
import { ChunkErrorHandler } from './chunk-error-handler';

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
        appUpdateService = spectator.inject(AppUpdateService) as jest.Mocked<AppUpdateService>;
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
