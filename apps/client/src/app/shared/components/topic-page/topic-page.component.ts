import { AuthService } from '../../../services/auth/auth.service';
import { ForumReadService } from '../../../services/forum/forum-read.service';
import { ForumService } from '../../../services/forum/forum.service';
import { buildForumFeed } from '../../helpers/forum-feed';
import { isMessageRead } from '../../helpers/forum-read';
import { readForumAnchor } from '../../helpers/forum-route-params';
import { ForumTopicResolveResult } from '../../services/forum-topic-page/forum-topic-page-data.service';
import { ErrorComponent } from '../error/error.component';
import { ForumComposerComponent } from '../forum-composer/forum-composer.component';
import { MessageCardComponent } from '../message-card/message-card.component';
import { TopicFeedEdgeComponent, TopicFeedEdgeState } from '../topic-feed-edge/topic-feed-edge.component';
import { DOCUMENT } from '@angular/common';
import {
    afterNextRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumMessage, ForumTopicPage } from '@drevo-web/shared';
import { ScrollbarDirective } from '@drevo-web/ui/scrollbar';
import { EMPTY, Observable, Subject, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';

/** Which way «load more» walks out of the page the resolver served. */
type LoadDirection = 'previous' | 'next';

/** Where the feed opens: the anchored message's id, the unread mark, the end of the messages, or their top. */
type OpeningPosition = number | 'unread' | 'end' | 'top';

/** Sub-pixel rounding of a scroll position the feed set itself. */
const SCROLL_TOLERANCE_PX = 1;

@Component({
    selector: 'app-topic-page',
    imports: [ErrorComponent, ForumComposerComponent, MessageCardComponent, ScrollbarDirective, TopicFeedEdgeComponent],
    templateUrl: './topic-page.component.html',
    styleUrl: './topic-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly forumService = inject(ForumService);
    private readonly forumReadService = inject(ForumReadService);
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
    private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
    private readonly messagesElement = viewChild<ElementRef<HTMLElement>>('messages');
    private readonly unreadDivider = viewChild<ElementRef<HTMLElement>>('unreadDivider');
    private releaseOpeningPosition: (() => void) | undefined;

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
    readonly feed = computed(() => {
        const topic = this.topic();
        return topic ? buildForumFeed(topic.id, this._messages(), this.ownLogin()) : [];
    });

    readonly topic = computed(() => {
        const result = this._resolveResult();
        return typeof result === 'object' ? result.topic : undefined;
    });

    /** The first message the reader had not read when the topic opened; the mark stays there while they read on. */
    readonly unreadFrom = computed(() => this.topic()?.firstUnreadId);

    /** The anchored message, unless it is the first unread one: the unread mark shows the reader that place instead. */
    readonly highlightedId = computed(() => {
        const anchorId = this._anchorId();
        return anchorId === this.unreadFrom() ? undefined : anchorId;
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
        inject(DestroyRef).onDestroy(() => this.releaseOpeningPosition?.());

        afterRenderEffect(onCleanup => {
            const scroller = this.scroller()?.nativeElement;
            if (!scroller) {
                return;
            }
            const onScroll = (): void => this.reportRead();
            scroller.addEventListener('scroll', onScroll, { passive: true });
            onCleanup(() => scroller.removeEventListener('scroll', onScroll));
        });
    }

    onLoadPrevious(): void {
        this.loadMoreSubject.next('previous');
    }

    onLoadNext(): void {
        this.loadMoreSubject.next('next');
    }

    /**
     * A feed that reaches the last page takes the new message at its end. One
     * that stops short of it opens on the message instead: appended there, it
     * would sit above pages not loaded yet, and loading them would put it out of order.
     */
    onPosted(message: ForumMessage): void {
        this.releaseOpeningPosition?.();
        if (this.hasNext()) {
            void this.router.navigate(['/', ...this._topicPath(), message.id]);
            return;
        }

        this._messages.update(messages => [...messages, message]);
        afterNextRender(
            () => this.document.getElementById(`message-${message.id}`)?.scrollIntoView({ block: 'nearest' }),
            { injector: this.injector },
        );
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
        this.scrollToOpeningPosition();
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
     * The anchored message when the address names one, as Telegram opens a
     * link to a message; otherwise the end of the topic, as it opens a chat
     * whose messages are all read. A served page with more below opens at its
     * top: its end would put the next end of the feed on screen and load it at
     * once. The top is scrolled to rather than assumed, since a reused feed
     * still holds the previous topic's position.
     *
     * The resolver already asked for the page holding the anchored message, so
     * the card is in the list this render puts on screen. The jump is instant:
     * the earlier page may arrive above the card while a smooth scroll is still
     * heading for the old position, and the animation would then overshoot.
     */
    private scrollToOpeningPosition(): void {
        const position = this.openingPosition();

        afterNextRender(
            () => {
                this.scrollTo(position);
                this.holdOpeningPosition(position);
                // A feed the topic fits in never scrolls, so what it opens on is read here.
                this.reportRead();
            },
            { injector: this.injector },
        );
    }

    /**
     * The unread mark, when the address names no other message and the served
     * page holds it — as a chat opens on its first unread message.
     */
    private openingPosition(): OpeningPosition {
        const anchorId = this.highlightedId();
        if (anchorId !== undefined) {
            return anchorId;
        }
        const unreadFrom = this.unreadFrom();
        if (this._messages().some(message => message.id === unreadFrom)) {
            return 'unread';
        }

        return this.hasNext() ? 'top' : 'end';
    }

    private scrollTo(position: OpeningPosition): void {
        if (position === 'unread') {
            this.unreadDivider()?.nativeElement.scrollIntoView({ block: 'start' });
        } else if (position === 'end') {
            this.scrollToEnd();
        } else if (position === 'top') {
            this.messagesElement()?.nativeElement.scrollIntoView({ block: 'start' });
        } else {
            this.document.getElementById(`message-${position}`)?.scrollIntoView({ block: 'start' });
        }
    }

    /**
     * Cards change height after the opening scroll — a picture without
     * declared dimensions arrives later — and would carry the reader off the
     * position. The feed returns to it on every resize until it is scrolled
     * anywhere else — by wheel, touch, keyboard, scrollbar or assistive
     * technology alike, or by `keepInPlace` under a prepended page, which
     * keeps the reader where they were from then on — or the reader posts, or
     * another topic opens.
     */
    private holdOpeningPosition(position: OpeningPosition): void {
        this.releaseOpeningPosition?.();
        const messages = this.messagesElement()?.nativeElement;
        const scroller = this.scroller()?.nativeElement;
        if (!messages || !scroller || typeof ResizeObserver === 'undefined') {
            return;
        }

        let heldTop = scroller.scrollTop;
        const observer = new ResizeObserver(() => {
            this.scrollTo(position);
            heldTop = scroller.scrollTop;
        });
        const onScroll = (): void => {
            if (Math.abs(scroller.scrollTop - heldTop) > SCROLL_TOLERANCE_PX) {
                release();
            }
        };
        const release = (): void => {
            observer.disconnect();
            scroller.removeEventListener('scroll', onScroll);
            this.releaseOpeningPosition = undefined;
        };
        observer.observe(messages);
        scroller.addEventListener('scroll', onScroll, { passive: true });
        this.releaseOpeningPosition = release;
    }

    /** A last message taller than the feed opens on its start, where its reading begins. */
    private scrollToEnd(): void {
        const lastMessage = this._messages().at(-1);
        const lastCard = lastMessage && this.document.getElementById(`message-${lastMessage.id}`);
        const feedHeight = this.scroller()?.nativeElement.clientHeight ?? 0;

        if (lastCard && lastCard.offsetHeight > feedHeight) {
            lastCard.scrollIntoView({ block: 'start' });
        } else {
            this.messagesElement()?.nativeElement.scrollIntoView({ block: 'end' });
        }
    }

    /**
     * Reports the furthest unread message the reader has on screen. Messages
     * run down the feed in id order, so it is the last card that counts as read.
     */
    private reportRead(): void {
        const topicId = this.topic()?.id;
        const unreadFrom = this.unreadFrom();
        const scroller = this.scroller()?.nativeElement;
        if (topicId === undefined || unreadFrom === undefined || !scroller) {
            return;
        }

        const feed = scroller.getBoundingClientRect();
        const read = [...this._messages()].reverse().find(message => {
            const card = this.document.getElementById(`message-${message.id}`)?.getBoundingClientRect();
            return message.id >= unreadFrom && card !== undefined && isMessageRead(card, feed);
        });
        if (read) {
            this.forumReadService.markSeen(topicId, read.id);
        }
    }

    /**
     * Prepending grows the feed above what the reader is looking at; the scroll
     * follows by the same amount so the message they were on stays put.
     */
    private keepInPlace(firstMessage: ForumMessage | undefined): void {
        const card = firstMessage && this.document.getElementById(`message-${firstMessage.id}`);
        const scroller = this.scroller()?.nativeElement;
        if (!card || !scroller) {
            return;
        }
        const topBefore = card.getBoundingClientRect().top;

        afterNextRender(
            () => {
                scroller.scrollTop += card.getBoundingClientRect().top - topBefore;
            },
            { injector: this.injector },
        );
    }
}
