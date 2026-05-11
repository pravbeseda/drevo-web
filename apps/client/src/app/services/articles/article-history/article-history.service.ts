import { AuthService } from '../../auth/auth.service';
import { InworkService } from '../../inwork/inwork.service';
import { ArticleService } from '../article.service';
import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import {
    ApprovalStatus,
    ArticleHistoryItem,
    ArticleHistoryParams,
    formatDateHeader,
    InworkItem,
} from '@drevo-web/shared';

export type HistoryFilter =
    | 'all'
    | 'unchecked'
    | 'unfinished'
    | 'unmarked'
    | 'outside_dictionaries'
    | 'required'
    | 'my';

export type HistoryDisplayItem =
    | { readonly type: 'header'; readonly date: string }
    | { readonly type: 'version'; readonly data: ArticleHistoryItem }
    | { readonly type: 'inwork-header' }
    | { readonly type: 'inwork-item'; readonly data: InworkItem; readonly isOwn: boolean };

/**
 * Builds display items with date headers inserted between date groups.
 *
 * @param items - Flat list of history items sorted by date descending
 * @param referenceDate - Date used for relative date formatting (e.g. "Сегодня")
 * @returns Items interleaved with date group headers
 */
export function buildDisplayItems(
    items: readonly ArticleHistoryItem[],
    referenceDate: Date,
): readonly HistoryDisplayItem[] {
    if (items.length === 0) return [];

    const result: HistoryDisplayItem[] = [];
    let lastDateKey = '';

    for (const item of items) {
        const dateKey = formatDateHeader(item.date, referenceDate);
        if (dateKey !== lastDateKey) {
            result.push({ type: 'header', date: dateKey });
            lastDateKey = dateKey;
        }
        result.push({ type: 'version', data: item });
    }

    return result;
}

export const trackByFn = (_index: number, item: HistoryDisplayItem): string => {
    if (item.type === 'header') return `header-${item.date}`;
    if (item.type === 'inwork-header') return 'inwork-header';
    if (item.type === 'inwork-item') return `inwork-${item.data.title}-${item.data.author}`;
    return `version-${item.data.versionId}`;
};

export interface ArticleHistoryConfig {
    readonly articleId?: Signal<number | undefined>;
}

@Injectable()
export class ArticleHistoryService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly articleService = inject(ArticleService);
    private readonly authService = inject(AuthService);
    private readonly inworkService = inject(InworkService);
    private readonly logger = inject(LoggerService).withContext('ArticleHistoryService');

    private readonly _historyItems = signal<readonly ArticleHistoryItem[]>([]);
    private readonly _inworkItems = signal<readonly InworkItem[]>([]);
    private readonly _isLoading = signal(false);
    private readonly _isLoadingMore = signal(false);
    private readonly _totalItems = signal(0);
    private readonly _currentPage = signal(1);
    private readonly _activeFilter = signal<HistoryFilter>('all');
    private readonly _hasError = signal(false);
    private readonly _referenceDate = signal(new Date());

    private articleId?: Signal<number | undefined>;

    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly activeFilter = this._activeFilter.asReadonly();
    readonly hasError = this._hasError.asReadonly();

    private readonly currentUser = toSignal(this.authService.user$);

    readonly isAuthenticated = computed(() => !!this.currentUser());
    readonly hasItems = computed(() => this._historyItems().length > 0 || this._inworkItems().length > 0);

    readonly displayItems = computed<readonly HistoryDisplayItem[]>(() => {
        const historyItems = buildDisplayItems(this._historyItems(), this._referenceDate());
        const inworkItems = this._inworkItems();

        if (inworkItems.length === 0) return historyItems;

        const currentName = this.currentUser()?.name;
        const inworkDisplayItems: HistoryDisplayItem[] = [
            { type: 'inwork-header' },
            ...inworkItems.map(item => ({
                type: 'inwork-item' as const,
                data: item,
                isOwn: item.author === currentName,
            })),
        ];

        return [...inworkDisplayItems, ...historyItems];
    });

    readonly displayTotalItems = computed(() => {
        const inworkCount = this._inworkItems().length;
        const inworkDisplayCount = inworkCount > 0 ? inworkCount + 1 : 0;
        const total = this._totalItems();
        if (total === 0) return inworkDisplayCount;
        const loadedDisplayCount = this.displayItems().length;
        const loadedItemCount = this._historyItems().length;
        if (loadedItemCount >= total) return loadedDisplayCount;
        return loadedDisplayCount + (total - loadedItemCount);
    });

    readonly inworkVersionIds = computed(
        () =>
            new Set(
                this._inworkItems()
                    .filter(item => item.id > 0)
                    .map(item => item.id),
            ),
    );

    init(config?: ArticleHistoryConfig): void {
        this.articleId = config?.articleId;
        this.loadInworkIfNeeded();
        this.loadHistory();
    }

    onFilterChange(filter: HistoryFilter): void {
        if (this._activeFilter() === filter) return;
        this._activeFilter.set(filter);
        this._historyItems.set([]);
        this._currentPage.set(1);
        this._totalItems.set(0);
        this.logger.info('Filter changed', { filter });
        this.loadInworkIfNeeded();
        this.loadHistory();
    }

    onLoadMore(): void {
        if (this._isLoading() || this._isLoadingMore()) return;
        if (this._historyItems().length >= this._totalItems()) return;

        this._currentPage.update(p => p + 1);
        this.loadHistory(true);
    }

    onCancelInwork(title: string): void {
        this.inworkService
            .clearEditing(title)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this._inworkItems.update(items => items.filter(item => item.title !== title));
                this.logger.info('Cleared inwork editing mark', { title });
            });
    }

    private loadInworkIfNeeded(): void {
        if (this.articleId || this._activeFilter() !== 'all') {
            this._inworkItems.set([]);
            return;
        }

        this.inworkService
            .getInworkList()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(items => this._inworkItems.set(items));
    }

    private loadHistory(loadMore = false): void {
        if (loadMore) {
            this._isLoadingMore.set(true);
        } else {
            this._isLoading.set(true);
        }

        this._hasError.set(false);

        const params = this.buildParams();
        if (!params) {
            this._isLoading.set(false);
            this._isLoadingMore.set(false);
            return;
        }

        this.articleService
            .getArticlesHistory(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: response => {
                    if (loadMore) {
                        this._historyItems.update(items => [...items, ...response.items]);
                    } else {
                        this._historyItems.set(response.items);
                        this._referenceDate.set(new Date());
                    }
                    this._totalItems.set(response.total);
                    this._isLoading.set(false);
                    this._isLoadingMore.set(false);
                },
                error: error => {
                    this.logger.error('Failed to load article history', error);
                    if (loadMore) {
                        this._isLoadingMore.set(false);
                        this._currentPage.update(p => p - 1);
                    } else {
                        this._isLoading.set(false);
                        this._hasError.set(true);
                    }
                },
            });
    }

    private buildParams(): ArticleHistoryParams | undefined {
        let base: ArticleHistoryParams = {
            page: this._currentPage(),
        };

        if (this.articleId) {
            const id = this.articleId();
            if (!id) {
                this.logger.error('Cannot load history: article ID not available');
                return undefined;
            }
            base = { ...base, articleId: id };
        }

        const filter = this._activeFilter();
        if (filter === 'unchecked') {
            return { ...base, approved: ApprovalStatus.Pending };
        }
        if (
            filter === 'unfinished' ||
            filter === 'unmarked' ||
            filter === 'outside_dictionaries' ||
            filter === 'required'
        ) {
            this.logger.info('Filter not yet supported by backend', {
                filter,
            });
            return base;
        }
        if (filter === 'my') {
            const user = this.currentUser();
            if (!user) {
                this.logger.error('Cannot filter by author: user not loaded');
                return undefined;
            }
            return { ...base, author: user.login };
        }

        return base;
    }
}
