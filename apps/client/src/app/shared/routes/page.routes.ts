import { forumTopicRoutes } from './forum-topic.routes';
import { LinksService } from '../../services/links/links.service';
import { readRouteParam } from '../helpers/route-params';
import { pageEditSessionResolver } from '../resolvers/page-edit-session.resolver';
import { ActivatedRouteSnapshot, Route } from '@angular/router';
import { PageKind } from '@drevo-web/shared';

/**
 * Predicate for the `:id` route of an article or a news item's `runGuardsAndResolvers`.
 *
 * Re-runs the resolver when:
 * - the page `:id` changes (default `paramsChange` behavior), or
 * - the user returns to the empty-child content tab from any other child
 *   route (edit, version view, history, etc.). This keeps the page content
 *   fresh after an edit and also catches changes made in another tab or by
 *   another user.
 *
 * The id is read with `readRouteParam`, not off `paramMap`: a custom predicate
 * fully replaces the default `paramsChange`, whose `equalParamsAndUrlSegments`
 * compares the segments' matrix parameters too. Comparing the merged map alone
 * would answer "unchanged" for `/articles/42` -> `/articles/43;id=42` and leave
 * article 42 on screen under an address naming 43.
 */
export function shouldRerunPageResolver(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
    if (readRouteParam(from, 'id') !== readRouteParam(to, 'id')) return true;

    const fromPath = from.firstChild?.routeConfig?.path;
    const toPath = to.firstChild?.routeConfig?.path;
    return toPath === '' && fromPath !== '';
}

/**
 * The tabs an article and a news item share under their `:id` route: one
 * version and its editor, the versions and the discussions. Each reads its
 * page from `PageContext`, which the page route provides; the editor reads
 * the session its resolver opens for the kind.
 *
 * A fresh config per caller: the router writes its own bookkeeping onto a
 * route object, so two parents must not share one.
 */
export function pageTabRoutes(kind: PageKind): Route[] {
    return [
        {
            path: 'version/:versionId',
            loadComponent: () =>
                import('../components/page-version-tab/page-version-tab.component').then(
                    m => m.PageVersionTabComponent,
                ),
        },
        {
            path: 'version/:versionId/edit',
            loadComponent: () => import('../components/page-edit/page-edit.component').then(m => m.PageEditComponent),
            resolve: { session: pageEditSessionResolver(kind) },
            providers: [LinksService],
            data: { titleSource: 'session', titlePrefix: '*' },
        },
        {
            path: 'history',
            title: 'История версий',
            loadComponent: () =>
                import('../components/page-versions/page-versions.component').then(m => m.PageVersionsComponent),
        },
        {
            path: 'forum',
            title: 'Обсуждение',
            loadComponent: () =>
                import('../components/page-forum-tab/page-forum-tab.component').then(m => m.PageForumTabComponent),
            // A topic opened from the tab stays inside the page, so it is
            // addressed under it rather than at `/forum/topic/:id`.
            children: forumTopicRoutes(),
        },
    ];
}
