import { ForumService } from '../../../../services/forum/forum.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { MessageCardComponent } from '../../components/message-card/message-card.component';
import { readForumAnchor } from '../../forum-route-params';
import { ForumTopicResolveResult } from '../../resolvers/forum-topic.resolver';
import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumMessage, ForumTopicPage } from '@drevo-web/shared';
import { ButtonComponent, FormatDatePipe } from '@drevo-web/ui';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';

/** Which way «load more» walks out of the page the resolver served. */
type LoadDirection = 'previous' | 'next';

@Component({
    selector: 'app-topic-page',
    imports: [ButtonComponent, ErrorComponent, FormatDatePipe, MessageCardComponent, RouterLink],
    templateUrl: './topic-page.component.html',
    styleUrl: './topic-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly forumService = inject(ForumService);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly logger = inject(LoggerService).withContext('ForumTopicPage');
    private readonly loadMoreSubject = new Subject<LoadDirection>();

    private readonly _resolveResult = signal<ForumTopicResolveResult | undefined>(undefined);
    private readonly _messages = signal<readonly ForumMessage[]>([]);
    private readonly _anchorId = signal<number | undefined>(undefined);
    private readonly _firstPage = signal(1);
    private readonly _lastPage = signal(1);
    private readonly _totalPages = signal(0);
    private readonly _isLoadingPrevious = signal(false);
    private readonly _isLoadingNext = signal(false);

    readonly messages = this._messages.asReadonly();
    readonly anchorId = this._anchorId.asReadonly();
    readonly isLoadingPrevious = this._isLoadingPrevious.asReadonly();
    readonly isLoadingNext = this._isLoadingNext.asReadonly();

    readonly topic = computed(() => {
        const result = this._resolveResult();
        return typeof result === 'object' ? result.topic : undefined;
    });

    readonly isNotFound = computed(() => this._resolveResult() === 'not-found');
    readonly isLoadError = computed(() => this._resolveResult() === 'load-error');
    readonly hasPrevious = computed(() => this._firstPage() > 1);
    readonly hasNext = computed(() => this._lastPage() < this._totalPages());

    constructor() {
        this.route.data
            .pipe(
                map(data => data['topic'] as ForumTopicResolveResult),
                tap(result => this.applyResolved(result)),
                // Nested so that a new resolve — the reader followed an «in
                // reply to» link, which reuses this component — drops a
                // load-more still in flight instead of merging it into the new
                // topic.
                // The topic id comes from the resolved page, so a resolve that
                // failed has nothing to page through and never reaches here.
                switchMap(result => (typeof result === 'object' ? this.loadMore(result.topic.id) : EMPTY)),
                takeUntilDestroyed(),
            )
            .subscribe(({ direction, page }) => this.mergePage(direction, page));
    }

    onLoadPrevious(): void {
        this.loadMoreSubject.next('previous');
    }

    onLoadNext(): void {
        this.loadMoreSubject.next('next');
    }

    private applyResolved(result: ForumTopicResolveResult): void {
        this._resolveResult.set(result);
        const resolved = typeof result === 'object' ? result : undefined;
        this._isLoadingPrevious.set(false);
        this._isLoadingNext.set(false);
        this._messages.set(resolved?.messages.items ?? []);
        this._firstPage.set(resolved?.messages.page ?? 1);
        this._lastPage.set(resolved?.messages.page ?? 1);
        this._totalPages.set(resolved?.messages.totalPages ?? 0);
        // The snapshot is the router's, and it is already the address that
        // produced this data by the time the resolved data reaches here.
        const anchor = readForumAnchor(this.route.snapshot);
        this._anchorId.set(typeof anchor === 'number' ? anchor : undefined);
        this.scrollToAnchor();
    }

    private canLoad(direction: LoadDirection): boolean {
        return direction === 'previous'
            ? this.hasPrevious() && !this._isLoadingPrevious()
            : this.hasNext() && !this._isLoadingNext();
    }

    private setLoading(direction: LoadDirection, loading: boolean): void {
        const flag = direction === 'previous' ? this._isLoadingPrevious : this._isLoadingNext;
        flag.set(loading);
    }

    private loadMore(topicId: number): Observable<{ direction: LoadDirection; page: ForumTopicPage | undefined }> {
        return this.loadMoreSubject.pipe(
            filter(direction => this.canLoad(direction)),
            tap(direction => this.setLoading(direction, true)),
            // One direction must not cancel the other, so the two requests run
            // side by side; a second click in the same direction is already
            // refused by the loading flag the `filter` reads.
            mergeMap(direction => this.fetchPage(topicId, direction).pipe(map(page => ({ direction, page })))),
        );
    }

    private fetchPage(topicId: number, direction: LoadDirection): Observable<ForumTopicPage | undefined> {
        const page = direction === 'previous' ? this._firstPage() - 1 : this._lastPage() + 1;

        return this.forumService.getTopic(topicId, page).pipe(
            catchError((error: unknown) => {
                this.logger.error(`Failed to load page ${page} of the forum topic ${topicId}`, error);
                return of(undefined);
            }),
        );
    }

    private mergePage(direction: LoadDirection, page: ForumTopicPage | undefined): void {
        this.setLoading(direction, false);
        if (!page) {
            return;
        }

        if (direction === 'previous') {
            this._messages.set([...page.messages.items, ...this._messages()]);
            this._firstPage.set(page.messages.page);
        } else {
            this._messages.set([...this._messages(), ...page.messages.items]);
            this._lastPage.set(page.messages.page);
        }
        this._totalPages.set(page.messages.totalPages);
    }

    /**
     * The resolver already asked for the page holding the anchored message, so
     * the card is in the list this render puts on screen.
     */
    private scrollToAnchor(): void {
        const anchorId = this._anchorId();
        if (anchorId === undefined) {
            return;
        }

        afterNextRender(
            () => {
                const card = this.document.getElementById(`message-${anchorId}`);
                card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
            { injector: this.injector },
        );
    }
}
