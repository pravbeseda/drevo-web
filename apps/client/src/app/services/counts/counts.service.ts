import { CountsApiService } from './counts-api.service';
import { CountsInvalidationService } from './counts-invalidation.service';
import { AuthService } from '../auth/auth.service';
import { ForumService } from '../forum/forum.service';
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { User } from '@drevo-web/shared';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    EMPTY,
    filter,
    merge,
    Observable,
    startWith,
    switchMap,
    tap,
    throttleTime,
} from 'rxjs';

export const COUNTS_NAVIGATION_THROTTLE_MS = 60_000;
export const COUNTS_INVALIDATION_DEBOUNCE_MS = 2_000;

export interface HistoryCounts {
    readonly pendingArticles: number;
    readonly pendingNews: number;
    readonly pendingPictures: number;
}

/**
 * The counts behind the navigation badges, for whoever is signed in: loaded at
 * sign-in, on navigation, and after a reported change. The moderation queue is
 * loaded for moderators only, so `historyCounts` stays undefined for the rest.
 */
@Injectable({ providedIn: 'root' })
export class CountsService {
    private readonly countsApiService = inject(CountsApiService);
    private readonly forumService = inject(ForumService);
    private readonly invalidationService = inject(CountsInvalidationService);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('CountsService');

    private readonly _historyCounts = signal<HistoryCounts | undefined>(undefined);
    private readonly _forumUnread = signal(0);

    readonly historyCounts: Signal<HistoryCounts | undefined> = this._historyCounts.asReadonly();
    readonly forumUnread: Signal<number> = this._forumUnread.asReadonly();
    readonly pendingTotal: Signal<number> = computed(() => {
        const counts = this._historyCounts();
        return counts ? counts.pendingArticles + counts.pendingNews + counts.pendingPictures : 0;
    });

    constructor() {
        inject(AuthService)
            .user$.pipe(
                distinctUntilChanged((previous, current) => previous?.login === current?.login),
                tap(() => this.clear()),
                switchMap(user => (user ? this.refreshes().pipe(switchMap(() => this.load(user))) : EMPTY)),
                takeUntilDestroyed(),
            )
            .subscribe();
    }

    private refreshes(): Observable<unknown> {
        return merge(
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd),
                // The sign-in load opens the first interval, so the navigation that follows it asks for nothing.
                startWith(undefined),
                throttleTime(COUNTS_NAVIGATION_THROTTLE_MS),
            ),
            this.invalidationService.invalidated$.pipe(debounceTime(COUNTS_INVALIDATION_DEBOUNCE_MS)),
        );
    }

    private load(user: User): Observable<unknown> {
        return merge(
            this.forumService.getUnreadCount().pipe(
                tap(count => this._forumUnread.set(count)),
                catchError((error: unknown) => this.logFailure('Failed to load forum unread count', error)),
            ),
            user.permissions.canModerate
                ? this.countsApiService.getHistoryCounts().pipe(
                      tap(counts => this._historyCounts.set(counts)),
                      catchError((error: unknown) => this.logFailure('Failed to load history counts', error)),
                  )
                : EMPTY,
        );
    }

    private logFailure(message: string, error: unknown): Observable<never> {
        this.logger.error(message, error);
        return EMPTY;
    }

    private clear(): void {
        this._historyCounts.set(undefined);
        this._forumUnread.set(0);
    }
}
