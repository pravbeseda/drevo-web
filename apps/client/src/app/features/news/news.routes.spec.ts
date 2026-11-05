import { NEWS_ROUTES } from './news.routes';
import { NewsPageService } from './services/news-page.service';
import { PageContext } from '../../shared/services/page-context/page-context';
import { shouldRerunPageResolver } from '../../shared/routes/page.routes';
import { Route } from '@angular/router';

describe('NEWS_ROUTES', () => {
    const [root] = NEWS_ROUTES;
    const child = (path: string): Route | undefined => root.children?.find(route => route.path === path);

    it('resolves the sections once, for the feed and every news item', () => {
        expect(root.path).toBe('');
        expect(root.resolve?.['topics']).toBeDefined();
        expect(root.children?.map(route => route.path)).toEqual(['', ':id']);
    });

    it('opens the feed under its own title', async () => {
        const feed = child('');

        expect(feed?.title).toBe('Новости');
        expect(await feed?.loadComponent?.()).toBeDefined();
    });

    it('heads a news item with its title and hands it to the shared tabs as the page', async () => {
        const page = child(':id');

        expect(page?.data).toEqual({ titleSource: 'news' });
        expect(page?.resolve?.['news']).toBeDefined();
        expect(page?.runGuardsAndResolvers).toBe(shouldRerunPageResolver);
        expect(page?.providers).toEqual([NewsPageService, { provide: PageContext, useExisting: NewsPageService }]);
        expect(await page?.loadComponent?.()).toBeDefined();
    });

    it('shows the news item, one version, the versions and the discussions', async () => {
        const tabs = child(':id')?.children ?? [];

        expect(tabs.map(route => route.path)).toEqual(['', 'version/:versionId', 'history', 'forum']);
        expect(await tabs[0].loadComponent?.()).toBeDefined();
    });
});
