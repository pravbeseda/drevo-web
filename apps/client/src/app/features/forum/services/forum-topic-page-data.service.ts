import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { INVALID_ANCHOR, readForumAnchor } from '../forum-route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumTopicPage } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;

export type ForumTopicResolveResult = ForumTopicPage | 'not-found' | 'load-error';

/**
 * The topic behind `/forum/topic/:id`, loaded once for every reader of the
 * route: the page's data and the route's title are two readers of one request.
 *
 * Page-scoped — the route's `providers` hold it — and its instance outlives a
 * single activation, so the address it loaded for is part of the cache key.
 */
@Injectable()
export class ForumTopicPageDataService {
    private readonly forumService = inject(ForumService);
    private readonly logger: Logger = inject(LoggerService).withContext('ForumTopicPageDataService');

    private _load$: Observable<ForumTopicResolveResult> | undefined;
    private _loadedParams: string | undefined;

    load(route: ActivatedRouteSnapshot): Observable<ForumTopicResolveResult> {
        // The key is built from the values the load below reads, so that a
        // rejected address and an accepted one cannot share a cache entry.
        const paramsKey = [
            readRouteParam(route, 'id'),
            readRouteParam(route, 'messageId'),
            route.queryParamMap.get('page'),
        ].join('_');

        if (this._load$ && this._loadedParams === paramsKey) {
            return this._load$;
        }

        this._loadedParams = paramsKey;
        this._load$ = this.loadTopic(route).pipe(shareReplay(1));
        return this._load$;
    }

    /**
     * `/forum/topic/:id/:messageId` anchors on a message. The anchor is an id
     * like any other: an address naming one that is not an id is a page that is
     * not there, not the topic without an anchor.
     */
    private loadTopic(route: ActivatedRouteSnapshot): Observable<ForumTopicResolveResult> {
        const id = parsePositiveIntParam(readRouteParam(route, 'id'));
        if (id === undefined) {
            return of('not-found' as const);
        }

        const anchor = readForumAnchor(route);
        if (anchor === INVALID_ANCHOR) {
            return of('not-found' as const);
        }

        const page = parsePositiveIntParam(route.queryParamMap.get('page') ?? undefined);

        return this.forumService.getTopic(id, page, anchor).pipe(
            catchError((error: unknown) => {
                // A topic that is gone is a stale link, not a fault, so it is
                // answered without a log entry. Anything else is reported:
                // recovering the stream here is what keeps it from reaching the
                // global error handler, and so from reaching Sentry.
                if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
                    return of('not-found' as const);
                }

                this.logger.error(`Failed to load the forum topic ${id}`, error);
                return of('load-error' as const);
            }),
        );
    }
}
