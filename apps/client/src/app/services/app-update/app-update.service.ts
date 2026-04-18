import { Injectable, inject, signal } from '@angular/core';
import { LoggerService, WINDOW } from '@drevo-web/core';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
    private readonly window = inject(WINDOW);
    private readonly logger = inject(LoggerService).withContext('AppUpdateService');

    private readonly _chunkLoadFailed = signal(false);
    readonly chunkLoadFailed = this._chunkLoadFailed.asReadonly();

    notifyChunkLoadFailure(error: unknown, context: { url: string }): void {
        if (this._chunkLoadFailed()) {
            return;
        }
        this._chunkLoadFailed.set(true);
        this.logger.error('Chunk load failure — reload prompt shown', { error, ...context });
    }

    reload(): void {
        this.logger.info('User clicked reload after chunk load failure');
        this.window?.location.reload();
    }
}
