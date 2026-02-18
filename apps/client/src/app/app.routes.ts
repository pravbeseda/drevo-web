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
                loadChildren: () =>
                    import('./features/history/history.routes').then(m => m.HISTORY_ROUTES),
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
