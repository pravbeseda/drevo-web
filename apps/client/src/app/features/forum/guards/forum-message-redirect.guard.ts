import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlMatcher, UrlTree } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;

/**
 * The legacy forum's address of one message, `forum/<id>`: a single segment
 * that is a canonical id and nothing else, so a section name still reaches
 * `:part`.
 */
export const forumMessageMatcher: UrlMatcher = segments => {
    const [segment] = segments;
    const isMessageId =
        segments.length === 1 &&
        Object.keys(segment.parameters).length === 0 &&
        parsePositiveIntParam(segment.path) !== undefined;

    // eslint-disable-next-line no-null/no-null -- UrlMatcher's contract: null is «no match»
    return isMessageId ? { consumed: segments, posParams: { messageId: segment } } : null;
};

/**
 * Turns the legacy message address into the topic anchored on that message.
 *
 * A guard rather than a `redirectTo` function: redirects run while the URL is
 * matched, before the parent's `authGuard`, so the lookup would go out for a
 * reader who is not signed in. A failed lookup opens `/forum/topic/<id>`,
 * whose page reports a missing topic or a load error by itself.
 */
export const forumMessageRedirectGuard: CanActivateFn = (route): Observable<UrlTree> | UrlTree => {
    const router = inject(Router);
    const messageId = parsePositiveIntParam(readRouteParam(route, 'messageId'));
    if (messageId === undefined) {
        return router.createUrlTree(['/forum']);
    }

    const logger = inject(LoggerService).withContext('forumMessageRedirectGuard');

    return inject(ForumService)
        .getMessageTopic(messageId)
        .pipe(
            map(topicId => router.createUrlTree(['/forum/topic', topicId, messageId])),
            catchError((error: unknown) => {
                if (!(error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS)) {
                    logger.error(`Failed to resolve the forum message ${messageId}`, error);
                }
                return of(router.createUrlTree(['/forum/topic', messageId]));
            }),
        );
};
