import { ARTICLE_ROUTES, shouldRerunMissingArticleResolver } from './article.routes';
import { ArticleNewsTabComponent } from './pages/article-page/tabs/article-news-tab/article-news-tab.component';
import { articleNewsCreateSessionResolver } from './resolvers/article-news-create-session.resolver';
import { LinksService } from '../../services/links/links.service';
import { PageEditComponent } from '../../shared/components/page-edit/page-edit.component';
import { createRouteSnapshot } from '../../shared/testing/route-testing.helper';
import { ActivatedRouteSnapshot, Route, UrlSegment } from '@angular/router';

function withChild(route: ActivatedRouteSnapshot, childPath: string | undefined): ActivatedRouteSnapshot {
    if (childPath !== undefined) {
        Object.assign(route, { firstChild: { routeConfig: { path: childPath } } });
    }

    return route;
}

function titleSnapshot(
    title: string | undefined,
    childPath: string | undefined,
    segments?: UrlSegment[],
): ActivatedRouteSnapshot {
    return withChild(createRouteSnapshot(title === undefined ? {} : { title }, segments), childPath);
}

describe('shouldRerunMissingArticleResolver', () => {
    it('re-runs when the title changes', () => {
        const from = titleSnapshot('А', '');
        const to = titleSnapshot('Б', '');

        expect(shouldRerunMissingArticleResolver(from, to)).toBe(true);
    });

    it('re-runs when returning to the placeholder from the edit child (refreshes canCreate)', () => {
        const from = titleSnapshot('А', 'edit');
        const to = titleSnapshot('А', '');

        expect(shouldRerunMissingArticleResolver(from, to)).toBe(true);
    });

    it('does not re-run when navigating from the placeholder to a child route', () => {
        const from = titleSnapshot('А', '');
        const to = titleSnapshot('А', 'edit');

        expect(shouldRerunMissingArticleResolver(from, to)).toBe(false);
    });

    it('does not re-run when staying on the placeholder', () => {
        const from = titleSnapshot('А', '');
        const to = titleSnapshot('А', '');

        expect(shouldRerunMissingArticleResolver(from, to)).toBe(false);
    });

    it('re-runs when a matrix param shadows the title the address names', () => {
        // `/articles/find/ВИФСАИДА` -> `/articles/find/ГОЛГОФА;title=ВИФСАИДА`.
        const from = titleSnapshot('ВИФСАИДА', '');
        const to = titleSnapshot('ВИФСАИДА', '', [new UrlSegment('ГОЛГОФА', { title: 'ВИФСАИДА' })]);

        expect(shouldRerunMissingArticleResolver(from, to)).toBe(true);
    });
});

describe('ARTICLE_ROUTES', () => {
    const page = ARTICLE_ROUTES.find(route => route.path === ':id');
    const child = (path: string): Route | undefined => page?.children?.find(route => route.path === path);

    it("lists the article's news on its news tab", async () => {
        const tab = child('news');

        expect(tab?.title).toBe('Новости');
        expect(await tab?.loadComponent?.()).toBe(ArticleNewsTabComponent);
    });

    it("creates a news item from the tab in the page editor, inside the article's page", async () => {
        const create = child('news/new');

        expect(create?.title).toBe('Новая новость');
        expect(create?.data).toEqual({ titlePrefix: '*' });
        expect(create?.resolve?.['session']).toBe(articleNewsCreateSessionResolver);
        expect(create?.providers).toEqual([LinksService]);
        expect(await create?.loadComponent?.()).toBe(PageEditComponent);
    });

    describe('the placeholder of an article not written yet', () => {
        const placeholder = ARTICLE_ROUTES.find(route => route.path === 'find/:title');
        const placeholderChild = (path: string): Route | undefined =>
            placeholder?.children?.find(route => route.path === path);

        it('lists the news linked to its title on the news tab', async () => {
            const tab = placeholderChild('news');

            expect(tab?.title).toBe('Новости');
            expect(await tab?.loadComponent?.()).toBe(ArticleNewsTabComponent);
        });

        it('has no discussion, which hangs off an article that does not exist', () => {
            expect(placeholderChild('forum')).toBeUndefined();
        });
    });
});
