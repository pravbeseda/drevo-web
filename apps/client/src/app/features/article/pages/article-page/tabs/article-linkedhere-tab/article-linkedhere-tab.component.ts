import { ArticleService } from '../../../../../../services/articles';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from '../../../../../../services/articles/article.constants';
import { ArticlePageService } from '../../../../services/article-page.service';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnDestroy,
    OnInit,
    computed,
    inject,
    signal,
} from '@angular/core';
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
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/operators';

const DEBOUNCE_TIME_MS = 500;
const ROBOTS_META_SELECTOR = 'name="robots"';

@Component({
    selector: 'app-article-linkedhere-tab',
    imports: [RouterLink, SpinnerComponent, TextInputComponent, VirtualScrollerComponent, VirtualScrollerItemDirective],
    templateUrl: './article-linkedhere-tab.component.html',
    styleUrl: './article-linkedhere-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleLinkedHereTabComponent implements OnInit, OnDestroy {
    private readonly articleService = inject(ArticleService);
    private readonly pageService = inject(ArticlePageService);
    private readonly meta = inject(Meta);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleLinkedHereTab');
    private readonly searchSubject = new Subject<string>();

    readonly searchQuery = signal('');
    readonly items = signal<ArticleLinkedHereItem[]>([]);
    readonly total = signal(0);
    readonly currentPage = signal(1);
    readonly isLoading = signal(false);
    readonly isLoadingMore = signal(false);

    readonly hasResults = computed(() => this.items().length > 0 && !this.isLoading());
    readonly isEmpty = computed(() => !this.isLoading() && this.total() === 0 && this.searchQuery().length === 0);
    readonly isFilterEmpty = computed(() => !this.isLoading() && this.total() === 0 && this.searchQuery().length > 0);

    readonly trackByFn = (_index: number, item: ArticleLinkedHereItem): number => item.id;

    ngOnInit(): void {
        this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });

        this.searchSubject
            .pipe(
                startWith(''),
                distinctUntilChanged(),
                tap(() => {
                    this.isLoading.set(true);
                    this.currentPage.set(1);
                }),
                debounceTime(DEBOUNCE_TIME_MS),
                switchMap(query =>
                    this.fetchPage(query, 1).pipe(
                        catchError(error => {
                            this.logger.error('Failed to load linked-here list', error);
                            return of(this.emptyResponse());
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(response => {
                this.items.set([...response.items]);
                this.total.set(response.total);
                this.isLoading.set(false);
            });
    }

    ngOnDestroy(): void {
        this.meta.removeTag(ROBOTS_META_SELECTOR);
    }

    onSearchChange(value: string): void {
        const trimmed = value.trim();
        this.searchQuery.set(trimmed);
        this.searchSubject.next(trimmed);
    }

    onLoadMore(): void {
        if (this.items().length >= this.total()) {
            return;
        }

        const nextPage = this.currentPage() + 1;
        this.isLoadingMore.set(true);

        this.fetchPage(this.searchQuery(), nextPage)
            .pipe(
                catchError(error => {
                    this.logger.error('Failed to load linked-here page', error);
                    return of(this.emptyResponse());
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(response => {
                if (response.items.length > 0) {
                    this.items.set([...this.items(), ...response.items]);
                    this.currentPage.set(nextPage);
                }
                this.isLoadingMore.set(false);
            });
    }

    private fetchPage(query: string, page: number): Observable<ArticleLinkedHereResponse> {
        const title = this.pageService.title();
        if (!title) {
            return EMPTY;
        }
        return this.articleService.getLinkedHere({ title, query, page });
    }

    private emptyResponse(): ArticleLinkedHereResponse {
        return {
            items: [],
            total: 0,
            page: 1,
            pageSize: DEFAULT_ARTICLE_SEARCH_PAGE_SIZE,
            totalPages: 0,
        };
    }
}
