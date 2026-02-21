import { Route } from '@angular/router';

export const HISTORY_ROUTES: Route[] = [
    {
        path: 'articles/diff/:id',
        title: 'Сравнение версий',
        loadComponent: () => import('./pages/diff-page/diff-page.component').then(m => m.DiffPageComponent),
    },
    {
        path: 'articles/diff/:id1/:id2',
        title: 'Сравнение версий',
        loadComponent: () => import('./pages/diff-page/diff-page.component').then(m => m.DiffPageComponent),
    },
    {
        path: '',
        loadComponent: () => import('./pages/history-page/history.component').then(m => m.HistoryComponent),
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'articles',
            },
            {
                path: 'articles',
                loadComponent: () =>
                    import('./pages/articles-history/articles-history.component').then(m => m.ArticlesHistoryComponent),
            },
            {
                path: 'news',
                title: 'История новостей',
                loadComponent: () =>
                    import('./pages/news-history/news-history.component').then(m => m.NewsHistoryComponent),
            },
            {
                path: 'forum',
                title: 'История обсуждений',
                loadComponent: () =>
                    import('./pages/forum-history/forum-history.component').then(m => m.ForumHistoryComponent),
            },
            {
                path: 'pictures',
                title: 'История изображений',
                loadComponent: () => import('./pages/pictures/pictures.component').then(m => m.PicturesComponent),
            },
        ],
    },
];
