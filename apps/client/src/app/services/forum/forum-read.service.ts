import { ForumService } from './forum.service';
import { AuthService } from '../auth/auth.service';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ForumReadState } from '@drevo-web/shared';
import {
    catchError,
    concatMap,
    debounceTime,
    distinctUntilChanged,
    EMPTY,
    groupBy,
    map,
    mergeMap,
    Observable,
    scan,
    Subject,
    switchMap,
    tap,
} from 'rxjs';

export const FORUM_MARK_READ_DEBOUNCE_MS = 1000;

interface SeenMessage {
    readonly topicId: number;
    readonly messageId: number;
}

/**
 * What the reader has read of each topic. The topic page reports the messages
 * the reader has seen; the furthest one is sent once the reading pauses, and
 * the server's answer — what is left unread — is kept for the topic list.
 *
 * Root-scoped, so a report still waiting for the pause is sent after the
 * reader has left the topic.
 */
@Injectable({ providedIn: 'root' })
export class ForumReadService {
    private readonly forumService = inject(ForumService);
    private readonly logger = inject(LoggerService).withContext('ForumReadService');
    private readonly seenSubject = new Subject<SeenMessage>();
    private readonly _states = signal<ReadonlyMap<number, ForumReadState>>(new Map());

    /** The latest answer of the server by topic id; fresher than a list loaded before it. */
    readonly states: Signal<ReadonlyMap<number, ForumReadState>> = this._states.asReadonly();

    constructor() {
        inject(AuthService)
            .user$.pipe(
                map(user => user?.login),
                distinctUntilChanged(),
                // Another reader starts from nothing: neither the states nor the furthest messages are theirs.
                tap(() => this._states.set(new Map())),
                switchMap(() => this.reports()),
                takeUntilDestroyed(),
            )
            .subscribe(({ topicId, state }) => this._states.update(states => new Map(states).set(topicId, state)));
    }

    markSeen(topicId: number, messageId: number): void {
        this.seenSubject.next({ topicId, messageId });
    }

    /** A list page loaded from the server already counts every read sent before it. */
    forget(topicIds: readonly number[]): void {
        this._states.update(states => {
            const kept = new Map(states);
            topicIds.forEach(topicId => kept.delete(topicId));
            return kept;
        });
    }

    private reports(): Observable<{ topicId: number; state: ForumReadState }> {
        return this.seenSubject.pipe(
            groupBy(seen => seen.topicId),
            mergeMap(topic$ =>
                topic$.pipe(
                    scan((furthest, seen) => Math.max(furthest, seen.messageId), 0),
                    distinctUntilChanged(),
                    debounceTime(FORUM_MARK_READ_DEBOUNCE_MS),
                    concatMap(messageId => this.markRead(topic$.key, messageId)),
                    map(state => ({ topicId: topic$.key, state })),
                ),
            ),
        );
    }

    private markRead(topicId: number, messageId: number): Observable<ForumReadState> {
        return this.forumService.markRead(topicId, messageId).pipe(
            catchError((error: unknown) => {
                this.logger.error(`Failed to mark forum topic ${topicId} read up to message ${messageId}`, error);
                return EMPTY;
            }),
        );
    }
}
