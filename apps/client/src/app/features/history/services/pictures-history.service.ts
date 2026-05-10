import { PictureService } from '../../../services/pictures/picture.service';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { formatDateHeader, Picture, PicturePending } from '@drevo-web/shared';

const PENDING_PAGE_SIZE = 200;

export type PicturesDisplayItem =
    | { readonly type: 'header'; readonly date: string }
    | { readonly type: 'picture'; readonly data: Picture }
    | { readonly type: 'pending'; readonly data: PendingGroup };

export function buildDisplayItems(items: readonly Picture[], referenceDate: Date): readonly PicturesDisplayItem[] {
    if (items.length === 0) return [];

    const result: PicturesDisplayItem[] = [];
    let lastDateKey = '';

    for (const item of items) {
        const dateKey = formatDateHeader(item.date, referenceDate);
        if (dateKey !== lastDateKey) {
            result.push({ type: 'header', date: dateKey });
            lastDateKey = dateKey;
        }
        result.push({ type: 'picture', data: item });
    }

    return result;
}

export const trackByFn = (_index: number, item: PicturesDisplayItem): string => {
    switch (item.type) {
        case 'header':
            return `header-${item.date}`;
        case 'pending':
            return `pending-${item.data.pictureId}`;
        case 'picture':
            return `picture-${item.data.id}`;
    }
};

export interface PendingGroup {
    readonly pictureId: number;
    readonly currentTitle: string;
    readonly currentThumbnailUrl: string;
    readonly items: readonly PicturePending[];
}

function groupByPicture(items: readonly PicturePending[]): readonly PendingGroup[] {
    const map = new Map<number, PicturePending[]>();
    const order: number[] = [];

    for (const item of items) {
        let group = map.get(item.pictureId);
        if (!group) {
            group = [];
            map.set(item.pictureId, group);
            order.push(item.pictureId);
        }
        group.push(item);
    }

    return order.reduce<PendingGroup[]>((result, pictureId) => {
        const groupItems = map.get(pictureId);
        if (groupItems && groupItems.length > 0) {
            result.push({
                pictureId,
                currentTitle: groupItems[0].currentTitle,
                currentThumbnailUrl: groupItems[0].currentThumbnailUrl,
                items: groupItems,
            });
        }
        return result;
    }, []);
}

@Injectable()
export class PicturesHistoryService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly pictureService = inject(PictureService);
    private readonly logger = inject(LoggerService).withContext('PicturesHistoryService');

    private readonly _pendingItems = signal<readonly PicturePending[]>([]);
    private readonly _isPendingLoading = signal(false);
    private readonly _hasPendingError = signal(false);

    private readonly _recentItems = signal<readonly Picture[]>([]);
    private readonly _isRecentLoading = signal(false);
    private readonly _isRecentLoadingMore = signal(false);
    private readonly _recentCurrentPage = signal(1);
    private readonly _recentTotalItems = signal(0);
    private readonly _hasRecentError = signal(false);
    private readonly _referenceDate = signal(new Date());

    readonly isPendingLoading = this._isPendingLoading.asReadonly();
    readonly hasPendingError = this._hasPendingError.asReadonly();
    readonly isRecentLoading = this._isRecentLoading.asReadonly();
    readonly isRecentLoadingMore = this._isRecentLoadingMore.asReadonly();
    readonly hasRecentError = this._hasRecentError.asReadonly();

    readonly isInitialLoading = computed(() => this._isPendingLoading() || this._isRecentLoading());

    readonly hasPendingItems = computed(() => this._pendingItems().length > 0);
    readonly pendingGroups = computed(() => groupByPicture(this._pendingItems()));

    readonly hasRecentItems = computed(() => this._recentItems().length > 0);
    readonly hasMoreRecent = computed(() => {
        const loaded = this._recentItems().length;
        const total = this._recentTotalItems();
        return loaded < total;
    });

    readonly hasItems = computed(() => this.hasPendingItems() || this.hasRecentItems());

    readonly displayItems = computed<readonly PicturesDisplayItem[]>(() => {
        const pendingGroups = this.pendingGroups();
        const recentItems = buildDisplayItems(this._recentItems(), this._referenceDate());

        const result: PicturesDisplayItem[] = [];

        for (const group of pendingGroups) {
            result.push({ type: 'pending', data: group });
        }

        result.push(...recentItems);

        return result;
    });

    readonly displayTotalItems = computed(() => {
        const total = this._recentTotalItems();
        const pendingCount = this.pendingGroups().length;

        if (total === 0 && pendingCount === 0) return 0;

        const loadedDisplayCount = this.displayItems().length;
        const loadedItemCount = this._recentItems().length;
        if (loadedItemCount >= total) return loadedDisplayCount;
        return loadedDisplayCount + (total - loadedItemCount);
    });

    init(): void {
        this.loadPending();
        this.loadRecent();
    }

    onLoadMore(): void {
        if (this._isRecentLoading() || this._isRecentLoadingMore()) return;
        if (!this.hasMoreRecent()) return;

        this._recentCurrentPage.update(p => p + 1);
        this.loadRecent(true);
    }

    private loadPending(): void {
        this._isPendingLoading.set(true);
        this._hasPendingError.set(false);

        this.pictureService
            .getPending(1, PENDING_PAGE_SIZE)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: response => {
                    this._pendingItems.set(response.items);
                    this._isPendingLoading.set(false);
                },
                error: error => {
                    this.logger.error('Failed to load pending pictures', error);
                    this._isPendingLoading.set(false);
                    this._hasPendingError.set(true);
                },
            });
    }

    private loadRecent(loadMore = false): void {
        if (loadMore) {
            this._isRecentLoadingMore.set(true);
        } else {
            this._isRecentLoading.set(true);
        }

        this._hasRecentError.set(false);

        this.pictureService
            .getPictures({ page: this._recentCurrentPage() })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: response => {
                    if (loadMore) {
                        this._recentItems.update(items => [...items, ...response.items]);
                    } else {
                        this._recentItems.set(response.items);
                        this._referenceDate.set(new Date());
                    }
                    this._recentTotalItems.set(response.total);
                    this._isRecentLoading.set(false);
                    this._isRecentLoadingMore.set(false);
                },
                error: error => {
                    this.logger.error('Failed to load recent pictures', error);
                    if (loadMore) {
                        this._isRecentLoadingMore.set(false);
                        this._recentCurrentPage.update(p => p - 1);
                    } else {
                        this._isRecentLoading.set(false);
                        this._hasRecentError.set(true);
                    }
                },
            });
    }
}
