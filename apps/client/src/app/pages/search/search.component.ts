import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
    SpinnerComponent,
    TextInputComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';
import { ArticleSearchResult } from '@drevo-web/shared';
import {
    debounceTime,
    distinctUntilChanged,
    EMPTY,
    Subject,
    switchMap,
    tap,
} from 'rxjs';
import { ArticleService } from '../../services/articles';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from '../../services/articles/article.constants';

const DEBOUNCE_TIME_MS = 500;

@Component({
    selector: 'app-search',
    imports: [
        CommonModule,
        RouterLink,
        TextInputComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly searchSubject = new Subject<string>();

    readonly searchQuery = signal('');
    readonly searchResults = signal<ArticleSearchResult[]>([]);
    readonly isLoading = signal(false);
    readonly isLoadingMore = signal(false);
    readonly totalResults = signal(0);
    readonly currentPage = signal(1);

    readonly hasResults = computed(
        () => this.searchResults().length > 0 && !this.isLoading()
    );
    readonly showNoResults = computed(
        () =>
            this.searchQuery().length > 0 &&
            !this.isLoading() &&
            !this.hasResults()
    );

    readonly trackByFn = (_index: number, item: ArticleSearchResult): number =>
        item.id;

    ngOnInit(): void {
        this.searchSubject
            .pipe(
                debounceTime(DEBOUNCE_TIME_MS),
                distinctUntilChanged(),
                tap(query => {
                    if (query.trim().length === 0) {
                        this.searchResults.set([]);
                        this.totalResults.set(0);
                        this.isLoading.set(false);
                    }
                    this.currentPage.set(1);
                }),
                switchMap(query => {
                    if (query.trim().length === 0) {
                        return EMPTY;
                    }
                    return this.articleService.searchArticles({
                        query,
                        page: 1,
                    });
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: response => {
                    this.searchResults.set([...response.items]);
                    this.totalResults.set(response.total);
                    this.isLoading.set(false);
                },
                error: () => {
                    this.searchResults.set([]);
                    this.totalResults.set(0);
                    this.isLoading.set(false);
                },
            });
    }

    onSearchChange(value: string): void {
        this.searchQuery.set(value);

        if (value.trim().length > 0) {
            this.isLoading.set(true);
        }

        this.searchSubject.next(value);
    }

    onLoadMore(): void {
        const query = this.searchQuery();
        const nextPage = this.currentPage() + 1;
        const currentResults = this.searchResults();

        // Check if we already have all results
        if (currentResults.length >= this.totalResults()) {
            return;
        }

        this.isLoadingMore.set(true);

        this.articleService
            .searchArticles({ query, page: nextPage })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: response => {
                    this.searchResults.set([
                        ...currentResults,
                        ...response.items,
                    ]);
                    this.currentPage.set(nextPage);
                    this.isLoadingMore.set(false);
                },
                error: () => {
                    this.isLoadingMore.set(false);
                },
            });
    }
}
