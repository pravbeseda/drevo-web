import { newsCreateSessionResolver } from './resolvers/news-create-session.resolver';
import { newsTopicsResolver } from './resolvers/news-topics.resolver';
import { NewsPageService } from './services/news-page.service';
import { LinksService } from '../../services/links/links.service';
import { pageResolver } from '../../shared/resolvers/page.resolver';
import { pageTabRoutes, shouldRerunPageResolver } from '../../shared/routes/page.routes';
import { DraftEditorService } from '../../shared/services/draft-editor/draft-editor.service';
import { PageContext } from '../../shared/services/page-context/page-context';
import { Route } from '@angular/router';

export const NEWS_ROUTES: Route[] = [
    {
        // Componentless: the sections resolve once for a news item's line and the create form.
        path: '',
        resolve: { topics: newsTopicsResolver },
        children: [
            // The news are listed in the history; the bare address of the old feed lands there.
            { path: '', pathMatch: 'full', redirectTo: '/history/news' },
            {
                // Ahead of `:id`, which would read `new` as an id.
                path: 'new',
                title: 'Новая новость',
                loadComponent: () =>
                    import('../../shared/components/page-edit/page-edit.component').then(m => m.PageEditComponent),
                resolve: { session: newsCreateSessionResolver },
                providers: [LinksService, DraftEditorService],
                data: { titlePrefix: '*' },
            },
            {
                path: ':id',
                loadComponent: () => import('./pages/news-page/news.component').then(m => m.NewsComponent),
                providers: [
                    NewsPageService,
                    { provide: PageContext, useExisting: NewsPageService },
                    DraftEditorService,
                ],
                // The key must be `news` — PageTitleStrategy reads data[titleSource].
                resolve: { news: pageResolver('news') },
                runGuardsAndResolvers: shouldRerunPageResolver,
                data: { titleSource: 'news' },
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        loadComponent: () =>
                            import('./pages/news-page/tabs/news-content-tab/news-content-tab.component').then(
                                m => m.NewsContentTabComponent,
                            ),
                    },
                    ...pageTabRoutes('news'),
                ],
            },
        ],
    },
];
