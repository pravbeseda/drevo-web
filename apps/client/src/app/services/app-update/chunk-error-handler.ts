import { AppUpdateService } from './app-update.service';
import { isChunkLoadError } from './is-chunk-load-error';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { WINDOW } from '@drevo-web/core';

@Injectable()
export class ChunkErrorHandler extends ErrorHandler {
    private readonly appUpdateService = inject(AppUpdateService);
    private readonly window = inject(WINDOW);

    override handleError(error: unknown): void {
        if (isChunkLoadError(error)) {
            const loc = this.window?.location;
            const url = loc ? loc.pathname + loc.search : '';
            this.appUpdateService.notifyChunkLoadFailure(error, { url });
        }
        super.handleError(error);
    }
}
