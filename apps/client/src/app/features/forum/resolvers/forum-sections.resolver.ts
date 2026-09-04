import { ForumService } from '../../../services/forum/forum.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ForumSection } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type ForumSectionsResolveResult = readonly ForumSection[] | 'load-error';

/**
 * Pure function for resolving the forum sections.
 * Extracted for testability without injection context.
 *
 * There is no `'not-found'` here: the endpoint names no entity that could be
 * missing, so every failure — a 404 among them, which would mean the route is
 * not deployed — is a fault worth reporting. Recovering the stream is what
 * keeps it from reaching the global error handler, and so from reaching Sentry.
 */
export function resolveForumSections(
    forumService: ForumService,
    logger: Logger,
): Observable<ForumSectionsResolveResult> {
    return forumService.getSections().pipe(
        catchError((error: unknown) => {
            logger.error('Failed to load the forum sections', error);
            return of('load-error' as const);
        }),
    );
}

export const forumSectionsResolver: ResolveFn<ForumSectionsResolveResult> = () =>
    resolveForumSections(inject(ForumService), inject(LoggerService).withContext('ForumSectionsResolver'));
