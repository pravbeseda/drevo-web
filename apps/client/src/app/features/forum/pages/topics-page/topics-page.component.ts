import { ForumService } from '../../../../services/forum/forum.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { TopicListComponent } from '../../../../shared/components/topic-list/topic-list.component';
import { readForumSectionParams } from '../../forum-route-params';
import { ForumTopicsResolveResult } from '../../resolvers/forum-topics.resolver';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { ButtonComponent } from '@drevo-web/ui';
import { Observable, Subject, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';

@Component({
    selector: 'app-topics-page',
    imports: [ButtonComponent, ErrorComponent, TopicListComponent],
    templateUrl: './topics-page.component.html',
    styleUrl: './topics-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicsPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly forumService = inject(ForumService);
    private readonly logger = inject(LoggerService).withContext('ForumTopicsPage');
    private readonly loadMoreSubject = new Subject<void>();

    private readonly _resolveResult = signal<ForumTopicsResolveResult | undefined>(undefined);
    private readonly _topics = signal<readonly ForumTopicListItem[]>([]);
    private readonly _lastPage = signal(1);
    private readonly _totalPages = signal(0);
    private readonly _isLoadingMore = signal(false);

    readonly topics = this._topics.asReadonly();
    readonly isLoadingMore = this._isLoadingMore.asReadonly();

    readonly hasTopicList = computed(() => typeof this._resolveResult() === 'object');
    readonly isNotFound = computed(() => this._resolveResult() === 'not-found');
    readonly isLoadError = computed(() => this._resolveResult() === 'load-error');
    readonly hasMore = computed(() => this._lastPage() < this._totalPages());

    constructor() {
        this.route.data
            .pipe(
                map(data => data['topics'] as ForumTopicsResolveResult),
                tap(result => this.applyResolved(result)),
                // Nested so that a new resolve — the reader moved to another
                // section, which reuses this component — drops a load-more
                // still in flight instead of merging it into the new list.
                switchMap(() =>
                    this.loadMoreSubject.pipe(
                        filter(() => !this._isLoadingMore() && this.hasMore()),
                        tap(() => this._isLoadingMore.set(true)),
                        switchMap(() => this.fetchNextPage()),
                    ),
                ),
                takeUntilDestroyed(),
            )
            .subscribe(response => this.appendPage(response));
    }

    onLoadMore(): void {
        this.loadMoreSubject.next();
    }

    private applyResolved(result: ForumTopicsResolveResult): void {
        this._resolveResult.set(result);
        const page = typeof result === 'object' ? result : undefined;
        this._isLoadingMore.set(false);
        this._topics.set(page?.items ?? []);
        this._lastPage.set(page?.page ?? 1);
        this._totalPages.set(page?.totalPages ?? 0);
    }

    private appendPage(response: ForumTopicListResponse | undefined): void {
        this._isLoadingMore.set(false);
        if (!response) {
            return;
        }

        this._topics.set([...this._topics(), ...response.items]);
        this._lastPage.set(response.page);
        this._totalPages.set(response.totalPages);
    }

    /**
     * The address the resolver was given decides which section is paged, read
     * through the same function the resolver used. A section it refuses cannot
     * reach here: the resolver answered `'not-found'` and there is no list to
     * page through.
     */
    private fetchNextPage(): Observable<ForumTopicListResponse | undefined> {
        const section = readForumSectionParams(this.route.snapshot);

        return this.forumService.getTopics(section?.part, section?.partId, this._lastPage() + 1).pipe(
            catchError((error: unknown) => {
                this.logger.error('Failed to load more forum topics', error);
                return of(undefined);
            }),
        );
    }
}
