import { authGuard } from './guards/auth.guard';
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'login',
        title: 'Вход',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
        data: { layout: 'none' },
    },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                title: 'Главная',
                loadComponent: () => import('./pages/main/main.component').then(m => m.MainComponent),
            },
            {
                path: 'editor',
                title: 'Редактор',
                loadComponent: () =>
                    import('./pages/shared-editor/shared-editor.component').then(m => m.SharedEditorComponent),
            },
            {
                path: 'history',
                title: 'История изменений',
                children: [
                    {
                        path: 'articles/diff2/:id',
                        title: 'Сравнение версий',
                        loadComponent: () =>
                            import('./pages/history/tabs/articles/diff-page/diff-page.component').then(
                                m => m.DiffPageComponent
                            ),
                    },
                    {
                        path: 'articles/diff2/:id1/:id2',
                        title: 'Сравнение версий',
                        loadComponent: () =>
                            import('./pages/history/tabs/articles/diff-page/diff-page.component').then(
                                m => m.DiffPageComponent
                            ),
                    },
                    {
                        path: 'articles/diff/:id',
                        title: 'Сравнение версий',
                        loadComponent: () =>
                            import('./pages/history/tabs/articles/cm-diff-page/cm-diff-page.component').then(
                                m => m.CmDiffPageComponent
                            ),
                    },
                    {
                        path: 'articles/diff/:id1/:id2',
                        title: 'Сравнение версий',
                        loadComponent: () =>
                            import('./pages/history/tabs/articles/cm-diff-page/cm-diff-page.component').then(
                                m => m.CmDiffPageComponent
                            ),
                    },
                    {
                        path: '',
                        loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
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
                                title: 'История новостей',
                                loadComponent: () =>
                                    import('./pages/history/tabs/news-history.component').then(
                                        m => m.NewsHistoryComponent
                                    ),
                            },
                            {
                                path: 'forum',
                                title: 'История обсуждений',
                                loadComponent: () =>
                                    import('./pages/history/tabs/forum-history.component').then(
                                        m => m.ForumHistoryComponent
                                    ),
                            },
                            {
                                path: 'pictures',
                                title: 'История изображений',
                                loadComponent: () =>
                                    import('./pages/history/tabs/pictures.component').then(m => m.PicturesComponent),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'articles/edit/:id',
                title: 'Редактирование статьи',
                loadComponent: () =>
                    import('./features/article/pages/article-edit/article-edit.component').then(m => m.ArticleEditComponent),
            },
            {
                path: 'articles/version/:id',
                title: 'Перенаправление',
                loadComponent: () =>
                    import('./features/article/pages/version-redirect/version-redirect.component').then(
                        m => m.VersionRedirectComponent
                    ),
            },
            {
                path: 'articles/:id',
                loadChildren: () => import('./features/article/article.routes').then(m => m.ARTICLE_ROUTES),
            },
            {
                path: '**',
                title: 'Страница не найдена',
                loadComponent: () => import('./pages/error/error.component').then(m => m.ErrorComponent),
                data: { showHomeButton: true },
            },
        ],
    },
];
