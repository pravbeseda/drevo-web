import { newsTopicsResolver } from './resolvers/news-topics.resolver';
import { NewsPageService } from './services/news-page.service';
import { pageResolver } from '../../shared/resolvers/page.resolver';
import { pageTabRoutes, shouldRerunPageResolver } from '../../shared/routes/page.routes';
import { DraftEditorService } from '../../shared/services/draft-editor/draft-editor.service';
import { PageContext } from '../../shared/services/page-context/page-context';
import { Route } from '@angular/router';

export const NEWS_ROUTES: Route[] = [
    {
        // Componentless: the sections resolve once for the feed's filter and a news item's line.
        path: '',
        resolve: { topics: newsTopicsResolver },
        children: [
            {
                path: '',
                pathMatch: 'full',
                title: 'Новости',
                loadComponent: () => import('./pages/news-feed/news-feed.component').then(m => m.NewsFeedComponent),
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
