import { CountsApiService } from './counts-api.service';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';

export interface HistoryCounts {
    readonly pendingArticles: number;
    readonly pendingNews: number;
    readonly pendingPictures: number;
}

@Injectable({ providedIn: 'root' })
export class HistoryCountsService {
    private readonly countsApiService = inject(CountsApiService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('HistoryCountsService');

    private readonly _counts = signal<HistoryCounts | undefined>(undefined);
    readonly counts = this._counts.asReadonly();

    loadCounts(): void {
        this.countsApiService
            .getHistoryCounts()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: counts => this._counts.set(counts),
                error: error => this.logger.error('Failed to load history counts', error),
            });
    }
}
