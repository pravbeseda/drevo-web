import { ForumService } from '../../../services/forum/forum.service';
import { parsePositiveIntParam } from '../../../shared/helpers/route-params';
import { readForumSectionParams } from '../forum-route-params';
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
 * `/forum` names no section and means every one; an address naming one the
 * readers refuse is not that page. `readForumSectionParams` is shared with the
 * page, which pages through the same section.
 */
export function resolveForumTopics(
    forumService: ForumService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
): Observable<ForumTopicsResolveResult> {
    const section = readForumSectionParams(route);
    if (section === undefined) {
        return of('not-found' as const);
    }

    const page = parsePositiveIntParam(route.queryParamMap.get('page') ?? undefined);

    return forumService.getTopics(section.part, section.partId, page).pipe(
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
