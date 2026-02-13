import { ArticlePageService } from './article-page.service';
import { Route } from '@angular/router';

export const ARTICLE_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./article.component').then(m => m.ArticleComponent),
        providers: [ArticlePageService],
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
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Новости' },
            },
            {
                path: 'forum',
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Обсуждение' },
            },
            {
                path: 'history',
                loadComponent: () =>
                    import('./article-versions/article-versions.component').then(m => m.ArticleVersionsComponent),
            },
            {
                path: 'linkedhere',
                loadComponent: () => import('./tabs/article-stub-tab.component').then(m => m.ArticleStubTabComponent),
                data: { stubTitle: 'Кто ссылается' },
            },
        ],
    },
];
