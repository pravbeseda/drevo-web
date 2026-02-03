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
import {
    APPROVAL_CLASS,
    ApprovalClass,
    ApprovalStatus,
    ArticleHistoryItem,
    ArticleHistoryParams,
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
    | {
          readonly type: 'version';
          readonly data: ArticleHistoryItem;
          readonly formattedTime: string;
          readonly approvalClass: ApprovalClass;
      };

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
    private readonly _hasError = signal(false);

    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly activeFilter = this._activeFilter.asReadonly();
    readonly hasError = this._hasError.asReadonly();

    private readonly currentUser = toSignal(this.authService.user$);

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
            result.push({
                type: 'version',
                data: item,
                formattedTime: this.formatTime(item.date),
                approvalClass: APPROVAL_CLASS[item.approved],
            });
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
        this._hasError.set(false);
        this.logger.info('Filter changed', { filter });
        this.loadHistory();
    }

    onLoadMore(): void {
        if (this._isLoading() || this._isLoadingMore()) return;
        if (this._historyItems().length >= this._totalItems()) return;

        this._currentPage.update(p => p + 1);
        this.loadHistory(true);
    }

    private formatTime(date: Date): string {
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

        this._hasError.set(false);

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
                    this._hasError.set(true);
                },
            });
    }

    private buildParams(): ArticleHistoryParams {
        const base: ArticleHistoryParams = {
            page: this._currentPage(),
        };

        const filter = this._activeFilter();
        if (filter === 'unchecked') {
            return { ...base, approved: ApprovalStatus.Pending };
        }
        if (filter === 'my') {
            const user = this.currentUser();
            if (user) {
                return { ...base, author: user.login };
            }
            this.logger.warn('Cannot filter by author: user not loaded');
        }

        return base;
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
