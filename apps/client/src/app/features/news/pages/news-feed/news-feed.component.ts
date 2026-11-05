import { NewsService } from '../../../../services/news/news.service';
import { parsePositiveIntParam } from '../../../../shared/helpers/route-params';
import { NewsTopicFilterComponent } from '../../components/news-topic-filter/news-topic-filter.component';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { NewsFeedItem, NewsTopic, formatDateHeader } from '@drevo-web/shared';
import { SpinnerComponent } from '@drevo-web/ui/spinner';
import { VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui/virtual-scroller';
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, exhaustMap, map, startWith, switchMap, tap } from 'rxjs/operators';

export type NewsFeedDisplayItem =
    | { readonly type: 'header'; readonly label: string }
    | { readonly type: 'news'; readonly data: NewsFeedItem; readonly sections: string };

type FeedState = 'loading' | 'loaded' | 'error';

const UNDATED_HEADER = 'Без даты';

/** The published news, newest first, under the days they are about; `?topic=` narrows it to one section. */
@Component({
    selector: 'app-news-feed',
    imports: [
        NewsTopicFilterComponent,
        RouterLink,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './news-feed.component.html',
    styleUrl: './news-feed.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsFeedComponent {
    private readonly newsService = inject(NewsService);
    private readonly route = inject(ActivatedRoute);
    private readonly logger = inject(LoggerService).withContext('NewsFeed');
    private readonly loadMoreSubject = new Subject<void>();

    /** The `topic` query parameter, bound by the router. */
    readonly topic = input<string>();

    /** The sections, resolved by the parent route. */
    readonly topics = toSignal(
        this.route.data.pipe(
            map((data): readonly NewsTopic[] => (data['topics'] as readonly NewsTopic[] | undefined) ?? []),
        ),
        { initialValue: [] },
    );

    readonly currentTopic = computed(() => parsePositiveIntParam(this.topic()));

    private readonly _items = signal<readonly NewsFeedItem[]>([]);
    private readonly _total = signal(0);
    private readonly _state = signal<FeedState>('loading');
    private readonly _isLoadingMore = signal(false);
    private readonly _referenceDate = signal(new Date());

    readonly isLoading = computed(() => this._state() === 'loading');
    readonly hasError = computed(() => this._state() === 'error');
    readonly isEmpty = computed(() => this._state() === 'loaded' && this._items().length === 0);
    readonly isLoadingMore = this._isLoadingMore.asReadonly();

    readonly displayItems = computed((): readonly NewsFeedDisplayItem[] => {
        const referenceDate = this._referenceDate();
        // A narrowed feed names no section: every row is in the one the filter shows.
        const titles = this.currentTopic() === undefined ? new Map(this.topics().map(t => [t.id, t.title])) : undefined;
        const result: NewsFeedDisplayItem[] = [];
        let lastLabel: string | undefined;
        for (const data of this._items()) {
            const label = data.newsDate ? formatDateHeader(data.newsDate, referenceDate) : UNDATED_HEADER;
            if (label !== lastLabel) {
                result.push({ type: 'header', label });
                lastLabel = label;
            }
            const sections = titles ? data.topics.flatMap(id => titles.get(id) ?? []).join(', ') : '';
            result.push({ type: 'news', data, sections });
        }
        return result;
    });

    /** What the scroller sizes itself for: the rows on screen and the news still to load. */
    readonly displayTotal = computed(() => this.displayItems().length + this._total() - this._items().length);

    readonly trackByFn = (_index: number, entry: NewsFeedDisplayItem): string =>
        entry.type === 'header' ? `header-${entry.label}` : `news-${entry.data.id}`;

    constructor() {
        // Another section starts the feed over and drops a page still in flight for the previous one.
        toObservable(this.currentTopic)
            .pipe(
                switchMap(topic => this.feed(topic)),
                takeUntilDestroyed(),
            )
            .subscribe();
    }

    onLoadMore(): void {
        this.loadMoreSubject.next();
    }

    /** The pages of one section's feed, the first at once and each next on request, one at a time. */
    private feed(topic: number | undefined): Observable<unknown> {
        this._items.set([]);
        this._total.set(0);
        this._state.set('loading');
        this._isLoadingMore.set(false);
        this._referenceDate.set(new Date());
        let lastPage = 0;

        return this.loadMoreSubject.pipe(
            startWith(undefined),
            exhaustMap(() => {
                if (lastPage > 0 && this._items().length >= this._total()) {
                    return EMPTY;
                }
                const page = lastPage + 1;
                this._isLoadingMore.set(page > 1);
                return this.newsService.getFeed({ topic, page }).pipe(
                    tap(response => {
                        lastPage = page;
                        this._items.update(items => [...items, ...response.items]);
                        this._total.set(response.total);
                        this._state.set('loaded');
                        this._isLoadingMore.set(false);
                    }),
                    catchError((error: unknown) => {
                        this.logger.error('Failed to load the news feed', { topic, page, error });
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
