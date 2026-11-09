import { ForumService } from '../../../services/forum/forum.service';
import { INVALID_ANCHOR, readForumAnchor, readForumPage } from '../../helpers/forum-route-params';
import { recoverResolveFailure, ResolveFailure, skipNotFoundToast } from '../../helpers/resolve-failure';
import { parsePositiveIntParam, readRouteParam } from '../../helpers/route-params';
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumTopicPage } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, switchMap } from 'rxjs/operators';

export type ForumTopicResolveResult = ForumTopicPage | ResolveFailure;

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

        return this.forumService.getTopic(id, page, anchor, skipNotFoundToast()).pipe(
            switchMap(served =>
                anchor === undefined && page === undefined ? this.fromFirstUnread(id, served) : of(served),
            ),
            catchError(recoverResolveFailure(this.logger, `Failed to load the forum topic ${id}`)),
        );
    }

    /**
     * A topic the address opens without naming a page or a message comes on
     * its last page. When its first unread message lies on an earlier one, the
     * topic is loaded again from there: read from the last page, it would move
     * the reader's read mark past the pages in between.
     */
    private fromFirstUnread(id: number, served: ForumTopicPage): Observable<ForumTopicPage> {
        const firstUnreadId = served.topic.firstUnreadId;
        const holdsIt = served.messages.items.some(message => message.id === firstUnreadId);

        return firstUnreadId === undefined || holdsIt
            ? of(served)
            : this.forumService.getTopic(id, undefined, firstUnreadId, skipNotFoundToast());
    }
}
