import { ResolveFn } from '@angular/router';

/**
 * The address of the list a topic or the new-topic form opens beside — the
 * route above it, so `/forum/common` from a topic picked there and
 * `/articles/7/forum` from an article's discussion tab.
 */
export const forumListLinkResolver: ResolveFn<string> = route =>
    '/' + (route.parent?.pathFromRoot ?? []).flatMap(ancestor => ancestor.url.map(segment => segment.path)).join('/');
