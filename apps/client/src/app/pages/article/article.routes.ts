import { ArticlePageService } from './article-page.service';
import { createArticleTabTitleResolver } from './article-tab-title.resolver';
import { articleTitleResolver } from './article-title.resolver';
import { articleResolver } from './article.resolver';
import { Route } from '@angular/router';

export const ARTICLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService],
        resolve: { article: articleResolver },
        title: articleTitleResolver,
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./tabs/article-content-tab.component').then(m => m.ArticleContentTabComponent),
            },
            {
                path: 'version/:versionId',
                loadComponent: () =>
                    import('./tabs/article-version-tab/article-version-tab.component').then(
                        m => m.ArticleVersionTabComponent
                    ),
            },
            {
                path: 'news',
                title: createArticleTabTitleResolver('Новости'),
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                title: createArticleTabTitleResolver('Обсуждение'),
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Обсуждение' },
            },
            {
                path: 'history',
                title: createArticleTabTitleResolver('История версий'),
                loadComponent: () =>
                    import('./article-versions/article-versions.component').then(m => m.ArticleVersionsComponent),
            },
            {
                path: 'linkedhere',
                title: createArticleTabTitleResolver('Кто ссылается'),
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Кто ссылается' },
            },
        ],
    },
];
