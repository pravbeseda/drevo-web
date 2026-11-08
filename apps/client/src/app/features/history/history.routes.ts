import { diffTitleResolver } from './resolvers/diff-title.resolver';
import { DiffPageDataService } from './services/diff-page-data.service';
import { Route } from '@angular/router';
import { PageKind } from '@drevo-web/shared';

/** The diff of one version against the one before it, and of two versions; `kind` is read from the data. */
function diffRoutes(kind: PageKind): Route[] {
    const route: Omit<Route, 'path'> = {
        title: diffTitleResolver,
        data: { titlePrefix: '#', kind },
        providers: [DiffPageDataService],
        loadComponent: () => import('./pages/diff-page/diff-page.component').then(m => m.DiffPageComponent),
    };
    return [
        { path: `${kind}/diff/:id`, ...route },
        { path: `${kind}/diff/:id1/:id2`, ...route },
    ];
}

export const HISTORY_ROUTES: Route[] = [
    ...diffRoutes('articles'),
    ...diffRoutes('news'),
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
                data: { kind: 'articles' satisfies PageKind },
                loadComponent: () =>
                    import('./pages/page-history/page-history.component').then(m => m.PageHistoryComponent),
            },
            {
                path: 'news',
                title: 'История новостей',
                data: { kind: 'news' satisfies PageKind },
                loadComponent: () =>
                    import('./pages/page-history/page-history.component').then(m => m.PageHistoryComponent),
            },
            {
                path: 'pictures',
                title: 'История иллюстраций',
                loadComponent: () =>
                    import('./pages/pictures-history/pictures-history.component').then(m => m.PicturesHistoryComponent),
            },
        ],
    },
];
