import { PageEditSession } from '../../../shared/models/page-edit-session';
import {
    NewsCreateDeps,
    injectNewsCreateDeps,
    resolveNewsCreateSession,
} from '../../../shared/resolvers/news-create-session.resolver';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn } from '@angular/router';
import { NewsTopic } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';

/**
 * A news item created from the news history, where it was asked for. Its
 * sections come from the news root, which resolved them ahead of this child.
 */
export function resolveHistoryNewsCreateSession(
    route: ActivatedRouteSnapshot,
    deps: NewsCreateDeps,
): Observable<PageEditSession | RedirectCommand> {
    const newsTopics = (route.parent?.data['topics'] as readonly NewsTopic[] | undefined) ?? [];
    return resolveNewsCreateSession({ exitUrl: '/history/news', draftKey: '/news/new' }, of(newsTopics), deps);
}

export const newsCreateSessionResolver: ResolveFn<PageEditSession | RedirectCommand> = route =>
    resolveHistoryNewsCreateSession(route, injectNewsCreateDeps());
