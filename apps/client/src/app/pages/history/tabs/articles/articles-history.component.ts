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
import { RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleHistoryItem } from '@drevo-web/shared';
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

const PAGE_SIZE = 25;

@Component({
    selector: 'app-articles-history',
    imports: [
        ButtonComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
        RouterLink,
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

    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly totalItems = this._totalItems.asReadonly();
    readonly activeFilter = this._activeFilter.asReadonly();

    readonly currentUser = toSignal(this.authService.user$);

    readonly hasItems = computed(() => this._historyItems().length > 0);

    readonly displayItems = computed<readonly HistoryDisplayItem[]>(() => {
        const items = this._historyItems();
        if (items.length === 0) return [];

        const result: HistoryDisplayItem[] = [];
        let lastDateKey = '';

        for (const item of items) {
            const dateKey = this.formatDateHeader(item.date);
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
        // Estimate: headers add roughly 1 per ~10 items (loaded items determine actual headers)
        // Use a high number so virtual scroller knows there's more to load
        const loadedDisplayCount = this.displayItems().length;
        const loadedItemCount = this._historyItems().length;
        if (loadedItemCount >= total) return loadedDisplayCount;
        // More items to load — return a number larger than current display count
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

    getApprovalClass(approved: number): string {
        switch (approved) {
            case 1:
                return 'approved';
            case -1:
                return 'rejected';
            default:
                return 'pending';
        }
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private loadHistory(loadMore = false): void {
        if (loadMore) {
            this._isLoadingMore.set(true);
        } else {
            this._isLoading.set(true);
        }

        const params = this.buildParams();

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
                    }
                    this._totalItems.set(response.total);
                    this._isLoading.set(false);
                    this._isLoadingMore.set(false);
                },
                error: error => {
                    this.logger.error('Failed to load article history', error);
                    this._isLoading.set(false);
                    this._isLoadingMore.set(false);
                },
            });
    }

    private buildParams(): {
        page: number;
        pageSize: number;
        approved?: number;
        author?: string;
    } {
        const params: {
            page: number;
            pageSize: number;
            approved?: number;
            author?: string;
        } = {
            page: this._currentPage(),
            pageSize: PAGE_SIZE,
        };

        const filter = this._activeFilter();
        if (filter === 'unchecked') {
            params.approved = 0;
        } else if (filter === 'my') {
            const user = this.currentUser();
            if (user) {
                params.author = user.login;
            }
        }

        return params;
    }

    private formatDateHeader(date: Date): string {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.isSameDay(date, today)) {
            return 'Сегодня';
        }
        if (this.isSameDay(date, yesterday)) {
            return 'Вчера';
        }

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year:
                date.getFullYear() !== today.getFullYear()
                    ? 'numeric'
                    : undefined,
        });
    }

    private isSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }
}
