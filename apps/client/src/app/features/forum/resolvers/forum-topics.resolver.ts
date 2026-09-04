import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumTopicListResponse } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;
/** The backend answers 400 INVALID_PART for a section that is not in the table. */
const UNKNOWN_PART_STATUS = 400;

export type ForumTopicsResolveResult = ForumTopicListResponse | 'not-found' | 'load-error';

/**
 * Pure function for resolving a page of forum topics from route params.
 * Extracted for testability without injection context.
 *
 * `/forum` names no section and means every one. Whether the address names one
 * is asked of paramMap directly — a param `readRouteParam` rejects is still a
 * param the address asked for, and must not fall back to "every section".
 */
export function resolveForumTopics(
    forumService: ForumService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
): Observable<ForumTopicsResolveResult> {
    const namesPart = route.paramMap.has('part');
    const namesPartId = route.paramMap.has('partId');
    const part = namesPart ? readRouteParam(route, 'part') : undefined;
    const partId = namesPartId ? parsePositiveIntParam(readRouteParam(route, 'partId')) : undefined;

    if ((namesPart && part === undefined) || (namesPartId && partId === undefined)) {
        return of('not-found' as const);
    }

    const page = parsePositiveIntParam(route.queryParamMap.get('page') ?? undefined);

    return forumService.getTopics(part, partId, page).pipe(
        catchError((error: unknown) => {
            // A section that does not exist is a stale link, not a fault, so it
            // is answered without a log entry. Anything else is reported:
            // recovering the stream here is what keeps it from reaching the
            // global error handler, and so from reaching Sentry.
            if (
                error instanceof HttpErrorResponse &&
                (error.status === NOT_FOUND_STATUS || error.status === UNKNOWN_PART_STATUS)
            ) {
                return of('not-found' as const);
            }

            logger.error('Failed to load the forum topics', error);
            return of('load-error' as const);
        }),
    );
}

export const forumTopicsResolver: ResolveFn<ForumTopicsResolveResult> = route =>
    resolveForumTopics(inject(ForumService), inject(LoggerService).withContext('ForumTopicsResolver'), route);
