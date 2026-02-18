import { createArticleTabTitleResolver } from './resolvers/article-tab-title.resolver';
import { articleTitleResolver } from './resolvers/article-title.resolver';
import { articleResolver } from './resolvers/article.resolver';
import { ArticlePageService } from './services/article-page.service';
import { Route } from '@angular/router';

export const ARTICLE_ROUTES: Route[] = [
    {
        path: 'edit/:id',
        title: 'Редактирование статьи',
        loadComponent: () =>
            import('./pages/article-edit/article-edit.component').then(m => m.ArticleEditComponent),
    },
    {
        path: 'version/:id',
        title: 'Перенаправление',
        loadComponent: () =>
            import('./pages/version-redirect/version-redirect.component').then(
                m => m.VersionRedirectComponent
            ),
    },
    {
        path: ':id',
        loadComponent: () =>
            import('./pages/article-page/article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService],
        resolve: { article: articleResolver },
        title: articleTitleResolver,
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-content-tab.component').then(
                        m => m.ArticleContentTabComponent
                    ),
            },
            {
                path: 'version/:versionId',
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-version-tab/article-version-tab.component').then(
                        m => m.ArticleVersionTabComponent
                    ),
            },
            {
                path: 'news',
                title: createArticleTabTitleResolver('Новости'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent
                    ),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                title: createArticleTabTitleResolver('Обсуждение'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent
                    ),
                data: { stubTitle: 'Обсуждение' },
            },
            {
                path: 'history',
                title: createArticleTabTitleResolver('История версий'),
                loadComponent: () =>
                    import('./components/article-versions/article-versions.component').then(
                        m => m.ArticleVersionsComponent
                    ),
            },
            {
                path: 'linkedhere',
                title: createArticleTabTitleResolver('Кто ссылается'),
                loadComponent: () =>
                    import('./pages/article-page/tabs/article-stub-tab.component').then(
                        m => m.ArticleStubTabComponent
                    ),
                data: { stubTitle: 'Кто ссылается' },
            },
        ],
    },
];
