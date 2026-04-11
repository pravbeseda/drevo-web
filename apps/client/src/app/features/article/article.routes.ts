import { createArticleTabTitleResolver } from './resolvers/article-tab-title.resolver';
import { articleVersionResolver } from './resolvers/article-version.resolver';
import { articleResolver } from './resolvers/article.resolver';
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

export const ARTICLE_ROUTES: Route[] = [
    {
        path: 'version/:versionId',
        title: 'Перенаправление',
        loadComponent: () =>
            import('./pages/version-redirect/version-redirect.component').then(m => m.VersionRedirectComponent),
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
                title: createArticleTabTitleResolver('Новости'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                title: createArticleTabTitleResolver('Обсуждение'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Обсуждение' },
            },
            {
                path: 'history',
                title: createArticleTabTitleResolver('История версий'),
                loadComponent: () =>
                    import('./components/article-versions/article-versions.component').then(
                        m => m.ArticleVersionsComponent,
                    ),
            },
            {
                path: 'linkedhere',
                title: createArticleTabTitleResolver('Кто ссылается'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent,
                    ),
                data: { stubTitle: 'Кто ссылается' },
            },
        ],
    },
];
