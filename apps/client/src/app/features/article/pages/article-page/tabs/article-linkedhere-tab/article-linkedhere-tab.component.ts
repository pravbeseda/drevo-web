import { ArticleService } from '../../../../../../services/articles';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from '../../../../../../services/articles/article.constants';
import { SidebarActionReserveComponent } from '../../../../../../shared/components/sidebar-action-reserve/sidebar-action-reserve.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleLinkedHereItem, ArticleLinkedHereResponse } from '@drevo-web/shared';
import {
    SpinnerComponent,
    TextInputComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';
import { Observable, Subject, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';

const DEBOUNCE_TIME_MS = 500;

const EMPTY_RESPONSE: ArticleLinkedHereResponse = {
    items: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_ARTICLE_SEARCH_PAGE_SIZE,
    totalPages: 0,
};

@Component({
    selector: 'app-article-linkedhere-tab',
    imports: [
        RouterLink,
        SidebarActionReserveComponent,
        SpinnerComponent,
        TextInputComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './article-linkedhere-tab.component.html',
    styleUrl: './article-linkedhere-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleLinkedHereTabComponent implements OnInit {
    private readonly articleService = inject(ArticleService);
    private readonly pageService = inject(ArticlePageService);
    private readonly meta = inject(Meta);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleLinkedHereTab');
    private readonly searchSubject = new Subject<string>();
    private readonly loadMoreSubject = new Subject<void>();

    private readonly _searchQuery = signal('');
    private readonly _items = signal<ArticleLinkedHereItem[]>([]);
    private readonly _total = signal(0);
    private readonly _currentPage = signal(1);
    private readonly _isLoading = signal(false);
    private readonly _isLoadingMore = signal(false);

    readonly searchQuery = this._searchQuery.asReadonly();
    readonly items = this._items.asReadonly();
    readonly total = this._total.asReadonly();
    readonly currentPage = this._currentPage.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();

    readonly hasResults = computed(() => this.items().length > 0);
    readonly isEmpty = computed(() => !this.isLoading() && this.total() === 0 && this.searchQuery().length === 0);
    readonly isFilterEmpty = computed(() => !this.isLoading() && this.total() === 0 && this.searchQuery().length > 0);

    readonly trackByFn = (_index: number, item: ArticleLinkedHereItem): number => item.id;

    ngOnInit(): void {
        const robotsTag = this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
        if (robotsTag) {
            this.destroyRef.onDestroy(() => this.meta.removeTagElement(robotsTag));
        }

        const markSearchStart = (): void => {
            this._isLoading.set(true);
            this._isLoadingMore.set(false);
            this._currentPage.set(1);
        };

        // Initial load fires immediately; user input is debounced.
        markSearchStart();

        const search$ = merge(
            of(''),
            this.searchSubject.pipe(distinctUntilChanged(), tap(markSearchStart), debounceTime(DEBOUNCE_TIME_MS)),
        ).pipe(map(query => ({ query, page: 1, append: false })));

        const loadMore$ = this.loadMoreSubject.pipe(
            filter(() => this.items().length < this.total()),
            tap(() => this._isLoadingMore.set(true)),
            map(() => ({ query: this.searchQuery(), page: this.currentPage() + 1, append: true })),
        );

        merge(search$, loadMore$)
            .pipe(
                switchMap(action =>
                    this.fetchPage(action.query, action.page).pipe(
                        map(response => ({ response, action })),
                        catchError(error => {
                            this.logger.error('Failed to load linked-here', error);
                            return of({ response: EMPTY_RESPONSE, action });
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(({ response, action }) => {
                if (action.append) {
                    if (response.items.length > 0) {
                        this._items.set([...this.items(), ...response.items]);
                        this._currentPage.set(action.page);
                    }
                    this._isLoadingMore.set(false);
                } else {
                    this._items.set([...response.items]);
                    this._total.set(response.total);
                    this._isLoading.set(false);
                }
            });
    }

    onSearchChange(value: string): void {
        const trimmed = value.trim();
        this._searchQuery.set(trimmed);
        this.searchSubject.next(trimmed);
    }

    onLoadMore(): void {
        this.loadMoreSubject.next();
    }

    private fetchPage(query: string, page: number): Observable<ArticleLinkedHereResponse> {
        const title = this.pageService.title();
        if (!title) {
            this.logger.warn('linkedhere fetched without article title');
            return of(EMPTY_RESPONSE);
        }
        return this.articleService.getLinkedHere({ title, query, page });
    }
}
