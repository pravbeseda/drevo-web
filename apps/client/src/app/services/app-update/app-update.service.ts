import { isChunkLoadError } from './is-chunk-load-error';
import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationError, Router } from '@angular/router';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
    private readonly window = inject(WINDOW);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('AppUpdateService');

    private readonly _chunkLoadFailed = signal(false);
    readonly chunkLoadFailed = this._chunkLoadFailed.asReadonly();

    constructor() {
        // Covers router navigations: in zoneless mode imperative router.navigate()
        // rejections may bypass the global ErrorHandler, so we listen to NavigationError
        // directly. ChunkErrorHandler complements this for non-router dynamic imports.
        this.router.events
            .pipe(
                takeUntilDestroyed(),
                filter((e): e is NavigationError => e instanceof NavigationError),
            )
            .subscribe(event => {
                if (isChunkLoadError(event.error)) {
                    this.notifyChunkLoadFailure(event.error, { url: event.url, source: 'router' });
                }
            });
    }

    notifyChunkLoadFailure(
        error: unknown,
        context: { readonly url: string; readonly source: 'router' | 'error-handler' },
    ): void {
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

    dismiss(): void {
        if (!this._chunkLoadFailed()) {
            return;
        }
        this._chunkLoadFailed.set(false);
        this.logger.info('User dismissed reload prompt; will reappear on next chunk load failure');
    }
}
