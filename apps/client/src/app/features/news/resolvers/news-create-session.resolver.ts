import { PageEditSession } from '../../../shared/models/page-edit-session';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { NewsTopic } from '@drevo-web/shared';

/**
 * The edit session of a news item not created yet. Its sections come from the
 * news root, which resolved them ahead of this child in the same navigation.
 */
export function resolveNewsCreateSession(route: ActivatedRouteSnapshot): PageEditSession {
    const newsTopics = (route.parent?.data['topics'] as readonly NewsTopic[] | undefined) ?? [];
    return { kind: 'news', mode: 'create', articleId: 0, versionId: 0, title: '', content: '', newsTopics };
}

export const newsCreateSessionResolver: ResolveFn<PageEditSession> = route => resolveNewsCreateSession(route);
