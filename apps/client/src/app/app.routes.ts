import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'article/edit',
        loadComponent: () =>
            import('./pages/article/article-edit/article-edit.component').then(
                m => m.ArticleEditComponent
            ),
    },
    {
        path: '**',
        redirectTo: 'article/edit',
    },
];
