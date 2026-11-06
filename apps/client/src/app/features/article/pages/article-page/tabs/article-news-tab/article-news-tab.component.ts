import { AuthService } from '../../../../../../services/auth/auth.service';
import { NewsService } from '../../../../../../services/news/news.service';
import { SidebarActionComponent } from '../../../../../../shared/components/sidebar-action/sidebar-action.component';
import { pageUrl } from '../../../../../../shared/helpers/page-kind';
import { ArticlePageService } from '../../../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { NewsListItem, NewsListSource, formatCalendarDate } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui/spinner';
import { VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui/virtual-scroller';
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, exhaustMap, startWith, switchMap, tap } from 'rxjs/operators';

/** A news item as the tab lists it: the day it is about, if it has one, and its title. */
export interface ArticleNewsRow {
    readonly id: number;
    readonly title: string;
    readonly day: string | undefined;
}

type ListState = 'loading' | 'loaded' | 'error';

/**
 * The published news about the article, or linked to the title of one not written yet,
 * newest first, a page at a time as the reader scrolls.
 */
@Component({
    selector: 'app-article-news-tab',
    imports: [
        RouterLink,
        SidebarActionComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './article-news-tab.component.html',
    styleUrl: './article-news-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleNewsTabComponent {
    private readonly newsService = inject(NewsService);
    private readonly pageService = inject(ArticlePageService);
    private readonly user = toSignal(inject(AuthService).user$);
    private readonly logger = inject(LoggerService).withContext('ArticleNewsTab');
    private readonly loadMoreSubject = new Subject<void>();

    private readonly _items = signal<readonly NewsListItem[]>([]);
    private readonly _total = signal(0);
    private readonly _state = signal<ListState>('loading');
    private readonly _isLoadingMore = signal(false);

    readonly total = this._total.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();
    readonly isLoading = computed(() => this._state() === 'loading');
    readonly hasError = computed(() => this._state() === 'error');
    readonly isEmpty = computed(() => this._state() === 'loaded' && this._items().length === 0);

    readonly rows = computed((): readonly ArticleNewsRow[] =>
        this._items().map(item => ({
            id: item.id,
            title: item.title,
            day: item.newsDate ? formatCalendarDate(item.newsDate) : undefined,
        })),
    );

    /** A reader who may edit adds a news item, as /api/news/create requires. */
    readonly addNewsUrl = computed((): string | undefined => {
        const articleId = this.pageService.articleId();
        const canEdit = this.user()?.permissions.canEdit ?? false;
        return articleId !== undefined && canEdit ? `${pageUrl('articles', articleId)}/news/new` : undefined;
    });

    readonly trackByFn = (_index: number, row: ArticleNewsRow): number => row.id;

    private readonly source = computed((): NewsListSource | undefined => {
        const articleId = this.pageService.articleId();
        if (articleId !== undefined) {
            return { articleId };
        }
        const missing = this.pageService.missing();
        return missing ? { title: missing.title } : undefined;
    });

    constructor() {
        // Another article starts the list over and drops a page still in flight for the previous one.
        toObservable(this.source)
            .pipe(
                switchMap(source => (source === undefined ? EMPTY : this.pages(source))),
                takeUntilDestroyed(),
            )
            .subscribe();
    }

    onLoadMore(): void {
        this.loadMoreSubject.next();
    }

    /** The pages of one source's news, the first at once and each next on request, one at a time. */
    private pages(source: NewsListSource): Observable<unknown> {
        this._items.set([]);
        this._total.set(0);
        this._state.set('loading');
        this._isLoadingMore.set(false);
        let lastPage = 0;

        return this.loadMoreSubject.pipe(
            startWith(undefined),
            exhaustMap(() => {
                if (lastPage > 0 && this._items().length >= this._total()) {
                    return EMPTY;
                }
                const page = lastPage + 1;
                this._isLoadingMore.set(page > 1);
                return this.newsService.getNewsList(source, page).pipe(
                    tap(response => {
                        lastPage = page;
                        this._items.update(items => [...items, ...response.items]);
                        this._total.set(response.total);
                        this._state.set('loaded');
                        this._isLoadingMore.set(false);
                    }),
                    catchError((error: unknown) => {
                        this.logger.error('Failed to load the news about the article', { source, page, error });
                        this._isLoadingMore.set(false);
                        if (page === 1) {
                            this._state.set('error');
                        }
                        return EMPTY;
                    }),
                );
            }),
        );
    }
}
