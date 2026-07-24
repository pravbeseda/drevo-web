import { articleVersionResolver } from './resolvers/article-version.resolver';
import { articleResolver } from './resolvers/article.resolver';
import { missingArticleResolver } from './resolvers/missing-article.resolver';
import { newArticleResolver } from './resolvers/new-article.resolver';
import { ArticlePageService } from './services/article-page.service';
import { LinksService } from '../../services/links/links.service';
import { DraftEditorService } from '../../shared/services/draft-editor/draft-editor.service';
import { ActivatedRouteSnapshot, Route } from '@angular/router';

/**
 * Predicate for the `:id` article route's `runGuardsAndResolvers`.
 *
 * Re-runs the resolver when:
 * - the article `:id` changes (default `paramsChange` behavior), or
 * - the user returns to the empty-child "article" tab from any other child
 *   route (edit, version view, history, etc.). This keeps the article content
 *   fresh after an edit and also catches changes made in another tab or by
 *   another user.
 */
export function shouldRerunArticleResolver(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
    if (from.paramMap.get('id') !== to.paramMap.get('id')) return true;

    const fromPath = from.firstChild?.routeConfig?.path;
    const toPath = to.firstChild?.routeConfig?.path;
    return toPath === '' && fromPath !== '';
}

/**
 * Predicate for the `find/:title` route's `runGuardsAndResolvers`.
 *
 * Re-runs `missingArticleResolver` when:
 * - the `:title` changes, or
 * - the user returns to the empty-child placeholder from any other child (e.g.
 *   `edit`). Without this, a redirect back from `/edit` (creation denied) leaves
 *   `ArticlePageService` holding a stale `canCreate: true`, so the "create"
 *   button stays visible and clicking it just loops the redirect.
 */
export function shouldRerunMissingArticleResolver(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
    if (from.paramMap.get('title') !== to.paramMap.get('title')) return true;

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
                    import('./pages/article-edit/article-edit.component').then(m => m.ArticleEditComponent),
                resolve: { session: newArticleResolver },
                providers: [LinksService],
                data: { titleSource: 'session', titlePrefix: '*' },
            },
            {
                path: 'news',
                title: 'Новости',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                title: 'Обсуждение',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Обсуждение' },
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
        providers: [ArticlePageService, DraftEditorService],
        resolve: { article: articleResolver },
        runGuardsAndResolvers: shouldRerunArticleResolver,
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
            {
                path: 'version/:versionId',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-version-tab/article-version-tab.component').then(
                        m => m.ArticleVersionTabComponent,
                    ),
            },
            {
                path: 'version/:versionId/edit',
                loadComponent: () =>
                    import('./pages/article-edit/article-edit.component').then(m => m.ArticleEditComponent),
                resolve: { version: articleVersionResolver },
                providers: [LinksService],
                data: { titleSource: 'version', titlePrefix: '*' },
            },
            {
                path: 'news',
                title: 'Новости',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                title: 'Обсуждение',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Обсуждение' },
            },
            {
                path: 'history',
                title: 'История версий',
                loadComponent: () =>
                    import('./components/article-versions/article-versions.component').then(
                        m => m.ArticleVersionsComponent,
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
];
