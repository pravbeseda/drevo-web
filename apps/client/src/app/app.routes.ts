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
                    import(
                        './pages/shared-editor/shared-editor.component'
                    ).then(m => m.SharedEditorComponent),
            },
            {
                path: 'articles/edit/:id',
                loadComponent: () =>
                    import('./pages/article-edit/article-edit.component').then(
                        m => m.ArticleEditComponent
                    ),
            },
            {
                path: 'articles/:id',
                loadComponent: () =>
                    import('./pages/article/article.component').then(
                        m => m.ArticleComponent
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
