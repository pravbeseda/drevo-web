import { AppUpdateService } from './app-update.service';
import { isChunkLoadError } from './is-chunk-load-error';
import { ErrorHandler, Injectable, InjectionToken, inject } from '@angular/core';
import { WINDOW } from '@drevo-web/core';

// Receives every error after ChunkErrorHandler has looked at it. Provided instead of overriding
// ErrorHandler, which would silently replace ChunkErrorHandler (#462).
export const DELEGATE_ERROR_HANDLER = new InjectionToken<ErrorHandler>('DELEGATE_ERROR_HANDLER');

@Injectable()
export class ChunkErrorHandler extends ErrorHandler {
    private readonly appUpdateService = inject(AppUpdateService);
    private readonly window = inject(WINDOW);
    private readonly delegate = inject(DELEGATE_ERROR_HANDLER, { optional: true });

    override handleError(error: unknown): void {
        if (isChunkLoadError(error)) {
            const loc = this.window?.location;
            const url = loc ? loc.pathname + loc.search : '';
            this.appUpdateService.notifyChunkLoadFailure(error, { url, source: 'error-handler' });
        }
        if (this.delegate) {
            this.delegate.handleError(error);
        } else {
            super.handleError(error);
        }
    }
}
