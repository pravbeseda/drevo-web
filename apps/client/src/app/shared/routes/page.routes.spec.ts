import { pageTabRoutes, shouldRerunPageResolver } from './page.routes';
import { LinksService } from '../../services/links/links.service';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';

function snapshot(
    id: string | undefined,
    childPath: string | undefined,
    segments?: UrlSegment[],
): ActivatedRouteSnapshot {
    const route = createRouteSnapshot(id === undefined ? {} : { id }, segments);
    if (childPath !== undefined) {
        Object.assign(route, { firstChild: { routeConfig: { path: childPath } } });
    }

    return route;
}

describe('shouldRerunPageResolver', () => {
    it('re-runs when the page id changes', () => {
        const from = snapshot('42', '');
        const to = snapshot('43', '');

        expect(shouldRerunPageResolver(from, to)).toBe(true);
    });

    it('re-runs when a matrix param shadows the id the address names', () => {
        // `/articles/42` -> `/articles/43;id=42`: the merged paramMap reads `42`
        // on both sides, so comparing it would keep article 42 on screen under
        // an address whose segment reads 43.
        const from = snapshot('42', '');
        const to = snapshot('42', '', [new UrlSegment('43', { id: '42' })]);

        expect(shouldRerunPageResolver(from, to)).toBe(true);
    });

    it('re-runs when returning to the empty content tab from a non-empty child route', () => {
        const from = snapshot('42', 'version/:versionId/edit');
        const to = snapshot('42', '');

        expect(shouldRerunPageResolver(from, to)).toBe(true);
    });

    it('does not re-run when navigating from the content tab to a non-empty child route', () => {
        const from = snapshot('42', '');
        const to = snapshot('42', 'history');

        expect(shouldRerunPageResolver(from, to)).toBe(false);
    });

    it('does not re-run when navigating between two non-empty child routes', () => {
        const from = snapshot('42', 'news');
        const to = snapshot('42', 'history');

        expect(shouldRerunPageResolver(from, to)).toBe(false);
    });

    it('does not re-run when staying on the content tab', () => {
        const from = snapshot('42', '');
        const to = snapshot('42', '');

        expect(shouldRerunPageResolver(from, to)).toBe(false);
    });
});

describe('pageTabRoutes', () => {
    it('addresses one version, the versions and the discussions of a page', () => {
        expect(pageTabRoutes('articles').map(route => route.path)).toEqual([
            'version/:versionId',
            'version/:versionId/edit',
            'history',
            'forum',
        ]);
    });

    it('edits a version of the page, its session resolved for the kind, its title marked as unsaved', () => {
        const edit = pageTabRoutes('news').find(route => route.path === 'version/:versionId/edit');

        expect(edit?.resolve?.['session']).toBeDefined();
        expect(edit?.data).toEqual({ titleSource: 'session', titlePrefix: '*' });
        expect(edit?.providers).toEqual([LinksService]);
    });

    it('opens a discussion topic under the page', () => {
        const forum = pageTabRoutes('articles').find(route => route.path === 'forum');

        expect(forum?.children?.map(route => route.path)).toEqual(['topic/:id', 'topic/:id/:messageId', 'new']);
    });

    it('hands every caller its own objects — the router writes its bookkeeping onto them', () => {
        const [first] = pageTabRoutes('articles');
        const [second] = pageTabRoutes('articles');

        expect(first).not.toBe(second);
    });

    it('loads every tab lazily', async () => {
        for (const route of pageTabRoutes('articles')) {
            expect(await route.loadComponent?.()).toBeDefined();
        }
    });
});
