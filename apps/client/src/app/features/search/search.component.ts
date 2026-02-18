import { ArticleService } from '../../services/articles';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ArticleSearchResult } from '@drevo-web/shared';
import {
    SpinnerComponent,
    TextInputComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
    HighlightPipe,
    MODAL_DATA,
    ModalData,
} from '@drevo-web/ui';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap, tap } from 'rxjs';

const DEBOUNCE_TIME_MS = 500;

@Component({
    selector: 'app-search',
    imports: [
        RouterLink,
        TextInputComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
        HighlightPipe,
    ],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly modalData = inject<ModalData>(MODAL_DATA, {
        optional: true,
    });
    private readonly searchSubject = new Subject<string>();

    readonly searchQuery = signal('');
    readonly searchResults = signal<ArticleSearchResult[]>([]);
    readonly isLoading = signal(false);
    readonly isLoadingMore = signal(false);
    readonly totalResults = signal(0);
    readonly currentPage = signal(1);

    readonly hasResults = computed(() => this.searchResults().length > 0 && !this.isLoading());
    readonly showNoResults = computed(
        () =>
            this.searchQuery().length > 0 &&
            !this.isLoading() &&
            this.totalResults() === 0 &&
            this.searchResults().length === 0
    );

    readonly trackByFn = (_index: number, item: ArticleSearchResult): number => item.id;

    closeModal(): void {
        this.modalData?.close();
    }

    ngOnInit(): void {
        this.searchSubject
            .pipe(
                startWith(''),
                map(query => query.trim()),
                distinctUntilChanged(),
                tap(() => {
                    this.isLoading.set(true);
                    this.currentPage.set(1);
                }),
                debounceTime(DEBOUNCE_TIME_MS),
                switchMap(query => {
                    return this.articleService
                        .searchArticles({
                            query,
                            page: 1,
                        })
                        .pipe(
                            catchError(() => {
                                return of({ items: [], total: 0 });
                            })
                        );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(response => {
                this.searchResults.set([...response.items]);
                this.totalResults.set(response.total);
                this.isLoading.set(false);
            });
    }

    onSearchChange(value: string): void {
        this.searchQuery.set(value);
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
            .pipe(
                catchError(() => {
                    return of({ items: [], total: 0 });
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(response => {
                if (response.items.length > 0) {
                    this.searchResults.set([...currentResults, ...response.items]);
                    this.currentPage.set(nextPage);
                }
                this.isLoadingMore.set(false);
            });
    }
}
