import { CountsApiService } from './counts-api.service';
import { inject, Injectable, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';

export interface HistoryCounts {
    readonly pendingArticles: number;
    readonly pendingNews: number;
    readonly pendingPictures: number;
}

@Injectable({ providedIn: 'root' })
export class HistoryCountsService {
    private readonly countsApiService = inject(CountsApiService);
    private readonly logger = inject(LoggerService).withContext('HistoryCountsService');

    private readonly _counts = signal<HistoryCounts | undefined>(undefined);
    readonly counts = this._counts.asReadonly();

    loadCounts(): void {
        this.countsApiService
            .getHistoryCounts()
            .subscribe({
                next: counts => this._counts.set(counts),
                error: error => this.logger.error('Failed to load history counts', error),
            });
    }
}
