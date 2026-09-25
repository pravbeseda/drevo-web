import { AuthService } from '../../../services/auth/auth.service';
import { ForumService } from '../../../services/forum/forum.service';
import { buildForumFeed } from '../../helpers/forum-feed';
import { readForumAnchor } from '../../helpers/forum-route-params';
import { scrollableAncestor } from '../../helpers/scrollable-ancestor';
import { ForumTopicResolveResult } from '../../services/forum-topic-page/forum-topic-page-data.service';
import { ErrorComponent } from '../error/error.component';
import { MessageCardComponent } from '../message-card/message-card.component';
import { TopicFeedEdgeComponent, TopicFeedEdgeState } from '../topic-feed-edge/topic-feed-edge.component';
import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumMessage, ForumTopicPage } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';

/** Which way «load more» walks out of the page the resolver served. */
type LoadDirection = 'previous' | 'next';

@Component({
    selector: 'app-topic-page',
    imports: [ErrorComponent, FormatDatePipe, MessageCardComponent, RouterLink, TopicFeedEdgeComponent],
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
    private readonly _topicPath = signal<readonly string[]>([]);
    private readonly _firstPage = signal(1);
    private readonly _lastPage = signal(1);
    private readonly _totalPages = signal(0);
    private readonly _loadState = {
        previous: signal<TopicFeedEdgeState>('idle'),
        next: signal<TopicFeedEdgeState>('idle'),
    };
    private readonly ownLogin = toSignal(inject(AuthService).user$.pipe(map(user => user?.login)));

    readonly anchorId = this._anchorId.asReadonly();

    /**
     * The topic's own address, which is where the panel is mounted rather than
     * a fixed one: `/forum/topic/:id` in the forum, and under the article when
     * its discussion tab opened the topic. The cards build their «in reply to»
     * links on it.
     */
    readonly topicPath = this._topicPath.asReadonly();
    readonly previousState = this._loadState.previous.asReadonly();
    readonly nextState = this._loadState.next.asReadonly();
    readonly feed = computed(() => buildForumFeed(this._messages(), this.ownLogin()));

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
        this._loadState.previous.set('idle');
        this._loadState.next.set('idle');
        this._messages.set(resolved?.messages.items ?? []);
        this._firstPage.set(resolved?.messages.page ?? 1);
        this._lastPage.set(resolved?.messages.page ?? 1);
        this._totalPages.set(resolved?.messages.totalPages ?? 0);
        // The snapshot is the router's, and it is already the address that
        // produced this data by the time the resolved data reaches here.
        const anchor = readForumAnchor(this.route.snapshot);
        this._anchorId.set(typeof anchor === 'number' ? anchor : undefined);
        this._topicPath.set(this.readTopicPath());
        this.scrollToAnchor();
    }

    /**
     * The address of this topic, taken from the route rather than assembled:
     * the anchored address carries one segment more, and it names a message
     * rather than the topic.
     */
    private readTopicPath(): readonly string[] {
        const segments = this.route.snapshot.pathFromRoot.flatMap(route => route.url.map(segment => segment.path));

        return readForumAnchor(this.route.snapshot) === undefined ? segments : segments.slice(0, -1);
    }

    private canLoad(direction: LoadDirection): boolean {
        const hasMore = direction === 'previous' ? this.hasPrevious() : this.hasNext();

        return hasMore && this._loadState[direction]() !== 'loading';
    }

    private loadMore(topicId: number): Observable<{ direction: LoadDirection; page: ForumTopicPage | undefined }> {
        return this.loadMoreSubject.pipe(
            filter(direction => this.canLoad(direction)),
            tap(direction => this._loadState[direction].set('loading')),
            // One direction must not cancel the other, so the two requests run
            // side by side; a second trigger in the same direction is already
            // refused by the loading state the `filter` reads.
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
        this._loadState[direction].set(page ? 'idle' : 'failed');
        if (!page) {
            return;
        }

        if (direction === 'previous') {
            this.keepInPlace(this._messages()[0]);
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
     * the card is in the list this render puts on screen. The jump is instant:
     * the earlier page may arrive above the card while a smooth scroll is still
     * heading for the old position, and the animation would then overshoot.
     */
    private scrollToAnchor(): void {
        const anchorId = this._anchorId();
        if (anchorId === undefined) {
            return;
        }

        afterNextRender(
            () => {
                const card = this.document.getElementById(`message-${anchorId}`);
                card?.scrollIntoView({ block: 'start' });
            },
            { injector: this.injector },
        );
    }

    /**
     * Prepending grows the feed above what the reader is looking at; the scroll
     * follows by the same amount so the message they were on stays put.
     */
    private keepInPlace(firstMessage: ForumMessage | undefined): void {
        const card = firstMessage && this.document.getElementById(`message-${firstMessage.id}`);
        if (!card) {
            return;
        }
        const topBefore = card.getBoundingClientRect().top;

        afterNextRender(
            () => {
                const shift = card.getBoundingClientRect().top - topBefore;
                scrollableAncestor(card).scrollTop += shift;
            },
            { injector: this.injector },
        );
    }
}
