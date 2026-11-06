import { articleNewsCreateSessionResolver } from './resolvers/article-news-create-session.resolver';
import { missingArticleResolver } from './resolvers/missing-article.resolver';
import { newArticleResolver } from './resolvers/new-article.resolver';
import { ArticlePageService } from './services/article-page.service';
import { LinksService } from '../../services/links/links.service';
import { readRouteParam } from '../../shared/helpers/route-params';
import { pageResolver } from '../../shared/resolvers/page.resolver';
import { pageTabRoutes, shouldRerunPageResolver } from '../../shared/routes/page.routes';
import { DraftEditorService } from '../../shared/services/draft-editor/draft-editor.service';
import { PageContext } from '../../shared/services/page-context/page-context';
import { ActivatedRouteSnapshot, Route } from '@angular/router';

/**
 * Predicate for the `find/:title` route's `runGuardsAndResolvers`.
 *
 * Re-runs `missingArticleResolver` when:
 * - the `:title` changes, or
 * - the user returns to the empty-child placeholder from a committed child
 *   (e.g. leaving the editor after `/edit` actually activated), so `canCreate`
 *   and the "create" button reflect current state.
 *
 * The title is read with `readRouteParam` for the reason `shouldRerunPageResolver` gives.
 *
 * The creation-denied redirect is handled separately in `newArticleResolver`:
 * it never commits `/edit`, so that same-URL redirect isn't observable here.
 */
export function shouldRerunMissingArticleResolver(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
    if (readRouteParam(from, 'title') !== readRouteParam(to, 'title')) return true;

    const fromPath = from.firstChild?.routeConfig?.path;
    const toPath = to.firstChild?.routeConfig?.path;
    return toPath === '' && fromPath !== '';
}

export const ARTICLE_ROUTES: Route[] = [
    {
        path: 'version/:versionId',
        title: 'Перенаправление',
        loadComponent: () =>
            import('./pages/version-redirect/version-redirect.component').then(m => m.VersionRedirectComponent),
    },
    {
        // Must stay ahead of `:id`, otherwise `find` is swallowed by it.
        path: 'find/:title',
        loadComponent: () => import('./pages/article-page/article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService, DraftEditorService],
        // The key must be `article` — PageTitleStrategy reads data[titleSource].
        resolve: { article: missingArticleResolver },
        // Refresh canCreate when returning to the placeholder from `/edit`
        // (creation may have been denied since the button was rendered).
        runGuardsAndResolvers: shouldRerunMissingArticleResolver,
        data: { titleSource: 'article' },
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-missing-tab/article-missing-tab.component').then(
                        m => m.ArticleMissingTabComponent,
                    ),
            },
            {
                path: 'edit',
                loadComponent: () =>
                    import('../../shared/components/page-edit/page-edit.component').then(m => m.PageEditComponent),
                resolve: { session: newArticleResolver },
                providers: [LinksService],
                data: { titleSource: 'session', titlePrefix: '*' },
            },
            {
                path: 'news',
                title: 'Новости',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-news-tab/article-news-tab.component').then(
                        m => m.ArticleNewsTabComponent,
                    ),
            },
            {
                path: 'linkedhere',
                title: 'Кто ссылается',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-linkedhere-tab/article-linkedhere-tab.component').then(
                        m => m.ArticleLinkedHereTabComponent,
                    ),
            },
        ],
    },
    {
        path: ':id',
        loadComponent: () => import('./pages/article-page/article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService, { provide: PageContext, useExisting: ArticlePageService }, DraftEditorService],
        resolve: { article: pageResolver('articles') },
        runGuardsAndResolvers: shouldRerunPageResolver,
        data: { titleSource: 'article' },
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-content-tab/article-content-tab.component').then(
                        m => m.ArticleContentTabComponent,
                    ),
            },
            ...pageTabRoutes('articles'),
            {
                path: 'news',
                title: 'Новости',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-news-tab/article-news-tab.component').then(
                        m => m.ArticleNewsTabComponent,
                    ),
            },
            {
                path: 'news/new',
                title: 'Новая новость',
                loadComponent: () =>
                    import('../../shared/components/page-edit/page-edit.component').then(m => m.PageEditComponent),
                resolve: { session: articleNewsCreateSessionResolver },
                providers: [LinksService],
                data: { titlePrefix: '*' },
            },
            {
                path: 'linkedhere',
                title: 'Кто ссылается',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-linkedhere-tab/article-linkedhere-tab.component').then(
                        m => m.ArticleLinkedHereTabComponent,
                    ),
            },
        ],
    },
];
