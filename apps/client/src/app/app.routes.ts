import { authGuard } from './guards/auth.guard';
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'login',
        title: 'Вход',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
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
                loadComponent: () => import('./features/main/main.component').then(m => m.MainComponent),
            },
            {
                path: 'editor',
                title: 'Редактор',
                loadComponent: () =>
                    import('./features/editor/shared-editor.component').then(m => m.SharedEditorComponent),
            },
            {
                path: 'history',
                title: 'История изменений',
                loadChildren: () => import('./features/history/history.routes').then(m => m.HISTORY_ROUTES),
            },
            {
                path: 'pictures',
                title: 'Иллюстрации',
                loadChildren: () => import('./features/picture/picture.routes').then(m => m.PICTURES_ROUTES),
            },
            {
                path: 'articles',
                loadChildren: () => import('./features/article/article.routes').then(m => m.ARTICLE_ROUTES),
            },
            {
                path: '**',
                title: 'Страница не найдена',
                loadComponent: () => import('./shared/components/error/error.component').then(m => m.ErrorComponent),
                data: { showHomeButton: true },
            },
        ],
    },
];
