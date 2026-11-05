import { NewsService } from '../../services/news/news.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Pure function for resolving the news sections.
 * Extracted for testability without injection context.
 *
 * A failure is reported and resolves no sections: a news item and the create
 * form read on without them, only the section names and choice are missing.
 */
export function resolveNewsTopics(newsService: NewsService, logger: Logger): Observable<readonly NewsTopic[]> {
    return newsService.getTopics().pipe(
        catchError((error: unknown) => {
            logger.error('Failed to load the news sections', error);
            return of([]);
        }),
    );
}

export const newsTopicsResolver: ResolveFn<readonly NewsTopic[]> = () =>
    resolveNewsTopics(inject(NewsService), inject(LoggerService).withContext('NewsTopicsResolver'));
