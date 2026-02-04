import { ArticlesHistoryItemComponent } from './articles-history-item/articles-history-item.component';
import { ArticleService } from '../../../../services/articles/article.service';
import { AuthService } from '../../../../services/auth/auth.service';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import {
    ApprovalStatus,
    ArticleHistoryItem,
    ArticleHistoryParams,
    formatDateHeader,
} from '@drevo-web/shared';
import {
    ButtonComponent,
    SpinnerComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';

type HistoryFilter = 'all' | 'unchecked' | 'my';

type HistoryDisplayItem =
    | { readonly type: 'header'; readonly date: string }
    | { readonly type: 'version'; readonly data: ArticleHistoryItem };

@Component({
    selector: 'app-articles-history',
    imports: [
        ArticlesHistoryItemComponent,
        ButtonComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './articles-history.component.html',
    styleUrl: './articles-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly articleService = inject(ArticleService);
    private readonly authService = inject(AuthService);
    private readonly logger = inject(LoggerService).withContext(
        'ArticlesHistoryComponent'
    );

    private readonly _historyItems = signal<readonly ArticleHistoryItem[]>([]);
    private readonly _isLoading = signal(false);
    private readonly _isLoadingMore = signal(false);
    private readonly _totalItems = signal(0);
    private readonly _currentPage = signal(1);
    private readonly _activeFilter = signal<HistoryFilter>('all');
    private readonly _hasError = signal(false);
    private readonly _referenceDate = signal(new Date());

    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly activeFilter = this._activeFilter.asReadonly();
    readonly hasError = this._hasError.asReadonly();

    private readonly currentUser = toSignal(this.authService.user$);

    readonly canFilterByAuthor = computed(() => !!this.currentUser());
    readonly hasItems = computed(() => this._historyItems().length > 0);

    readonly displayItems = computed<readonly HistoryDisplayItem[]>(() => {
        const items = this._historyItems();
        if (items.length === 0) return [];

        const now = this._referenceDate();
        const result: HistoryDisplayItem[] = [];
        let lastDateKey = '';

        for (const item of items) {
            const dateKey = formatDateHeader(item.date, now);
            if (dateKey !== lastDateKey) {
                result.push({ type: 'header', date: dateKey });
                lastDateKey = dateKey;
            }
            result.push({ type: 'version', data: item });
        }

        return result;
    });

    /** Total count including header rows for the virtual scroller */
    readonly displayTotalItems = computed(() => {
        const total = this._totalItems();
        if (total === 0) return 0;
        const loadedDisplayCount = this.displayItems().length;
        const loadedItemCount = this._historyItems().length;
        if (loadedItemCount >= total) return loadedDisplayCount;
        // Unloaded items counted 1:1; actual header count adjusts as items load
        return loadedDisplayCount + (total - loadedItemCount);
    });

    readonly trackByFn = (_index: number, item: HistoryDisplayItem): string => {
        if (item.type === 'header') return `header-${item.date}`;
        return `version-${item.data.versionId}`;
    };

    ngOnInit(): void {
        this.loadHistory();
    }

    onFilterChange(filter: HistoryFilter): void {
        if (this._activeFilter() === filter) return;
        this._activeFilter.set(filter);
        this._historyItems.set([]);
        this._currentPage.set(1);
        this._totalItems.set(0);
        this.logger.info('Filter changed', { filter });
        this.loadHistory();
    }

    onLoadMore(): void {
        if (this._isLoading() || this._isLoadingMore()) return;
        if (this._historyItems().length >= this._totalItems()) return;

        this._currentPage.update(p => p + 1);
        this.loadHistory(true);
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
                        this._historyItems.update(items => [
                            ...items,
                            ...response.items,
                        ]);
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
        const base: ArticleHistoryParams = {
            page: this._currentPage(),
        };

        const filter = this._activeFilter();
        if (filter === 'unchecked') {
            return { ...base, approved: ApprovalStatus.Pending };
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
