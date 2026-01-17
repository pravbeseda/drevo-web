import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';

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
                path: 'articles/:id',
                loadComponent: () =>
                    import('./pages/article/article.component').then(
                        m => m.ArticleComponent
                    ),
            },
        ],
    },
];
