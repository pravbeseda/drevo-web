import { AppUpdateService } from './app-update.service';
import { isChunkLoadError } from './is-chunk-load-error';
import { ErrorHandler, Injectable, InjectionToken, inject } from '@angular/core';
import { LoggerService, WINDOW } from '@drevo-web/core';

// Receives every error after ChunkErrorHandler has looked at it. Provided instead of overriding
// ErrorHandler, which would silently replace ChunkErrorHandler (#462).
export const DELEGATE_ERROR_HANDLER = new InjectionToken<ErrorHandler>('DELEGATE_ERROR_HANDLER');

// Every error nobody could handle locally ends up here, so it is logged here: that is what puts it
// into the IndexedDB log next to the errors the code catches itself.
@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
    private readonly appUpdateService = inject(AppUpdateService);
    private readonly logger = inject(LoggerService).withContext('ErrorHandler');
    private readonly window = inject(WINDOW);
    private readonly delegate = inject(DELEGATE_ERROR_HANDLER, { optional: true });

    handleError(error: unknown): void {
        if (isChunkLoadError(error)) {
            const loc = this.window?.location;
            const url = loc ? loc.pathname + loc.search : '';
            this.appUpdateService.notifyChunkLoadFailure(error, { url, source: 'error-handler' });
        }
        // Sentry's handler goes first so its unhandled-error event is the one kept: Sentry drops the
        // second capture of the same Error object that the log entry below would make.
        this.delegate?.handleError(error);
        this.logger.error('Unhandled error', error);
    }
}
