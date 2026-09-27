import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { Observable, Subject, of } from 'rxjs';
import { catchError, concatMap, switchMap } from 'rxjs/operators';

/**
 * Where the end of the list stands. A failed end waits for the reader's retry:
 * it is still on screen, so loading on sight would retry in a loop.
 */
export type TopicListLoadState = 'idle' | 'loading' | 'failed';

export type TopicPageFetch = (page: number) => Observable<ForumTopicListResponse>;

/**
 * The pages of a topic list loaded so far. The owner loads the first page —
 * it decides what an empty or a failed first page means — and hands it over;
 * the pages after it are loaded here as the reader scrolls.
 *
 * Component-scoped: each list pages on its own.
 */
@Injectable()
export class TopicListPagesService {
    private readonly logger = inject(LoggerService).withContext('TopicListPagesService');
    private readonly resetSubject = new Subject<TopicPageFetch>();
    private readonly nextPageSubject = new Subject<void>();

    private readonly _items = signal<readonly ForumTopicListItem[]>([]);
    private readonly _total = signal(0);
    private readonly _loadState = signal<TopicListLoadState>('idle');
    private lastPage = 0;
    private totalPages = 0;

    readonly items = this._items.asReadonly();
    readonly total = this._total.asReadonly();
    readonly loadState = this._loadState.asReadonly();

    constructor() {
        this.resetSubject
            .pipe(
                // A new list drops the page still in flight for the previous one.
                switchMap(fetchPage => this.nextPageSubject.pipe(concatMap(() => this.fetchNextPage(fetchPage)))),
                takeUntilDestroyed(),
            )
            .subscribe(response => this.appendPage(response));
    }

    /** Starts over from the first page, or from nothing when there is no list to page through. */
    reset(firstPage: ForumTopicListResponse | undefined, fetchPage: TopicPageFetch): void {
        this._items.set(firstPage?.items ?? []);
        this._total.set(firstPage?.total ?? 0);
        this._loadState.set('idle');
        this.lastPage = firstPage?.page ?? 0;
        this.totalPages = firstPage?.totalPages ?? 0;
        this.resetSubject.next(fetchPage);
    }

    loadMore(): void {
        if (this._loadState() === 'idle' && this.lastPage < this.totalPages) {
            this.requestNextPage();
        }
    }

    retry(): void {
        if (this._loadState() === 'failed') {
            this.requestNextPage();
        }
    }

    private requestNextPage(): void {
        this._loadState.set('loading');
        this.nextPageSubject.next();
    }

    private fetchNextPage(fetchPage: TopicPageFetch): Observable<ForumTopicListResponse | undefined> {
        return fetchPage(this.lastPage + 1).pipe(
            catchError((error: unknown) => {
                this.logger.error('Failed to load more forum topics', error);
                return of(undefined);
            }),
        );
    }

    private appendPage(response: ForumTopicListResponse | undefined): void {
        if (!response) {
            this._loadState.set('failed');
            return;
        }

        this._items.set([...this._items(), ...response.items]);
        this._total.set(response.total);
        this._loadState.set('idle');
        this.lastPage = response.page;
        this.totalPages = response.totalPages;
    }
}
