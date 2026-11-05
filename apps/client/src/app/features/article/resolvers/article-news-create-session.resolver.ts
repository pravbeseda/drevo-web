import { NewsService } from '../../../services/news/news.service';
import { pageUrl } from '../../../shared/helpers/page-kind';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { PageEditSession } from '../../../shared/models/page-edit-session';
import {
    NewsCreateDeps,
    injectNewsCreateDeps,
    resolveNewsCreateSession,
} from '../../../shared/resolvers/news-create-session.resolver';
import { resolveNewsTopics } from '../../../shared/resolvers/news-topics.resolver';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * A news item created from an article's news tab: cancelling returns to the
 * tab, and the draft is kept apart from one begun in the news history. An
 * address naming no article has no tab to return to, so it lands where the
 * news are listed.
 */
export function resolveArticleNewsCreateSession(
    route: ActivatedRouteSnapshot,
    newsService: NewsService,
    deps: NewsCreateDeps,
): Observable<PageEditSession | RedirectCommand> {
    const articleId = parsePositiveIntParam(readRouteParam(route, 'id'));
    if (articleId === undefined) {
        return of(new RedirectCommand(deps.router.parseUrl('/history/news'), { replaceUrl: true }));
    }
    const tabUrl = `${pageUrl('articles', articleId)}/news`;
    return resolveNewsCreateSession(
        { exitUrl: tabUrl, draftKey: `${tabUrl}/new` },
        resolveNewsTopics(newsService, deps.logger),
        deps,
    );
}

export const articleNewsCreateSessionResolver: ResolveFn<PageEditSession | RedirectCommand> = route =>
    resolveArticleNewsCreateSession(route, inject(NewsService), injectNewsCreateDeps());
