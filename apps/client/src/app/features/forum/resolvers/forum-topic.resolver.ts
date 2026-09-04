import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { INVALID_ANCHOR, readForumAnchor } from '../forum-route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumTopicPage } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;

export type ForumTopicResolveResult = ForumTopicPage | 'not-found' | 'load-error';

/**
 * Pure function for resolving a topic and a page of its messages from route
 * params. Extracted for testability without injection context.
 *
 * `/forum/topic/:id/:messageId` anchors on a message. The anchor is an id like
 * any other: an address naming one that is not an id is a page that is not
 * there, not the topic without an anchor.
 */
export function resolveForumTopic(
    forumService: ForumService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
): Observable<ForumTopicResolveResult> {
    const id = parsePositiveIntParam(readRouteParam(route, 'id'));
    if (id === undefined) {
        return of('not-found' as const);
    }

    const anchor = readForumAnchor(route);
    if (anchor === INVALID_ANCHOR) {
        return of('not-found' as const);
    }

    const page = parsePositiveIntParam(route.queryParamMap.get('page') ?? undefined);

    return forumService.getTopic(id, page, anchor).pipe(
        catchError((error: unknown) => {
            // A topic that is gone is a stale link, not a fault, so it is
            // answered without a log entry. Anything else is reported:
            // recovering the stream here is what keeps it from reaching the
            // global error handler, and so from reaching Sentry.
            if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
                return of('not-found' as const);
            }

            logger.error(`Failed to load the forum topic ${id}`, error);
            return of('load-error' as const);
        }),
    );
}

export const forumTopicResolver: ResolveFn<ForumTopicResolveResult> = route =>
    resolveForumTopic(inject(ForumService), inject(LoggerService).withContext('ForumTopicResolver'), route);
