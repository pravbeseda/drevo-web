import { authGuard } from './guards/auth.guard';
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.component').then(m => m.LoginComponent),
        data: { layout: 'none' },
    },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadComponent: () =>
                    import('./pages/main/main.component').then(
                        m => m.MainComponent
                    ),
            },
            {
                path: 'editor',
                loadComponent: () =>
                    import('./pages/shared-editor/shared-editor.component').then(
                        m => m.SharedEditorComponent
                    ),
            },
            {
                path: 'history/diff/:id',
                loadComponent: () =>
                    import('./pages/history/tabs/articles/diff-page/diff-page.component').then(
                        m => m.DiffPageComponent
                    ),
            },
            {
                path: 'history',
                loadComponent: () =>
                    import('./pages/history/history.component').then(
                        m => m.HistoryComponent
                    ),
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: 'articles',
                    },
                    {
                        path: 'articles',
                        loadComponent: () =>
                            import('./pages/history/tabs/articles/article-history/articles-history.component').then(
                                m => m.ArticlesHistoryComponent
                            ),
                    },
                    {
                        path: 'news',
                        loadComponent: () =>
                            import('./pages/history/tabs/news-history.component').then(
                                m => m.NewsHistoryComponent
                            ),
                    },
                    {
                        path: 'forum',
                        loadComponent: () =>
                            import('./pages/history/tabs/forum-history.component').then(
                                m => m.ForumHistoryComponent
                            ),
                    },
                    {
                        path: 'pictures',
                        loadComponent: () =>
                            import('./pages/history/tabs/pictures.component').then(
                                m => m.PicturesComponent
                            ),
                    },
                ],
            },
            {
                path: 'articles/edit/:id',
                loadComponent: () =>
                    import('./pages/article-edit/article-edit.component').then(
                        m => m.ArticleEditComponent
                    ),
            },
            {
                path: 'articles/version/:id',
                loadComponent: () =>
                    import('./pages/article/version-redirect.component').then(
                        m => m.VersionRedirectComponent
                    ),
            },
            {
                path: 'articles/:id',
                loadChildren: () =>
                    import('./pages/article/article.routes').then(
                        m => m.ARTICLE_ROUTES
                    ),
            },
            {
                path: '**',
                loadComponent: () =>
                    import('./pages/error/error.component').then(
                        m => m.ErrorComponent
                    ),
                data: { showHomeButton: true },
            },
        ],
    },
];
