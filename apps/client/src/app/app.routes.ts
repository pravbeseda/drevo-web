import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./pages/main/main.component').then(m => m.MainComponent),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'editor',
        loadComponent: () =>
            import('./pages/shared-editor/shared-editor.component').then(
                m => m.SharedEditorComponent
            ),
    },
    {
        path: 'articles/:id',
        loadComponent: () =>
            import('./pages/article/article.component').then(
                m => m.ArticleComponent
            ),
    },
];
