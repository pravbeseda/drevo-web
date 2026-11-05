import { resolveNewsTopics } from './news-topics.resolver';
import { NewsService } from '../../../services/news/news.service';
import { PageEditSession } from '../../../shared/models/page-edit-session';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** The edit session of a news item not created yet, with the sections it may be put in. */
export function resolveNewsCreateSession(newsService: NewsService, logger: Logger): Observable<PageEditSession> {
    return resolveNewsTopics(newsService, logger).pipe(
        map(newsTopics => ({
            kind: 'news',
            mode: 'create',
            articleId: 0,
            versionId: 0,
            title: '',
            content: '',
            newsTopics,
        })),
    );
}

export const newsCreateSessionResolver: ResolveFn<PageEditSession> = () =>
    resolveNewsCreateSession(inject(NewsService), inject(LoggerService).withContext('NewsCreateSessionResolver'));
