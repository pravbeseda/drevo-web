import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { INVALID_ANCHOR, readForumAnchor, readForumPage } from '../forum-route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
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
 * Page-scoped — the route's `providers` hold it — but the router builds that
 * injector once per route config and destroys it only under
 * `withExperimentalAutoCleanupInjectors()`, so the instance outlives the
 * activation it was made for. The navigation is therefore part of the cache
 * key: without it a second visit to an address would replay the first visit's
 * load, however old it is.
 */
@Injectable()
export class ForumTopicPageDataService {
    private readonly forumService = inject(ForumService);
    private readonly router = inject(Router);
    private readonly logger: Logger = inject(LoggerService).withContext('ForumTopicPageDataService');

    private _load$: Observable<ForumTopicResolveResult> | undefined;
    private _loadedKey: string | undefined;

    load(route: ActivatedRouteSnapshot): Observable<ForumTopicResolveResult> {
        // The navigation is what limits the cache to one activation; the values
        // the load below reads are what keeps a rejected address and an
        // accepted one out of a single cache entry.
        const loadKey = [
            this.router.currentNavigation()?.id,
            readRouteParam(route, 'id'),
            readRouteParam(route, 'messageId'),
            route.queryParamMap.get('page'),
        ].join('_');

        if (this._load$ && this._loadedKey === loadKey) {
            return this._load$;
        }

        this._loadedKey = loadKey;
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

        const page = readForumPage(route);

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
