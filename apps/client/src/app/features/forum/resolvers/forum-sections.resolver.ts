import { ForumService } from '../../../services/forum/forum.service';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumSection } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;

export type ForumSectionsResolveResult = readonly ForumSection[] | 'not-found' | 'load-error';

/**
 * Pure function for resolving the forum sections.
 * Extracted for testability without injection context.
 */
export function resolveForumSections(
    forumService: ForumService,
    logger: Logger,
): Observable<ForumSectionsResolveResult> {
    return forumService.getSections().pipe(
        catchError((error: unknown) => {
            // A page that is not there is a stale link, not a fault, so it is
            // answered without a log entry. Anything else is reported:
            // recovering the stream here is what keeps it from reaching the
            // global error handler, and so from reaching Sentry.
            if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
                return of('not-found' as const);
            }

            logger.error('Failed to load the forum sections', error);
            return of('load-error' as const);
        }),
    );
}

export const forumSectionsResolver: ResolveFn<ForumSectionsResolveResult> = () =>
    resolveForumSections(inject(ForumService), inject(LoggerService).withContext('ForumSectionsResolver'));
