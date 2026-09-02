import { shouldRerunArticleResolver, shouldRerunMissingArticleResolver } from './article.routes';
import { createRouteSnapshot } from '../../shared/testing/route-testing.helper';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';

function withChild(route: ActivatedRouteSnapshot, childPath: string | undefined): ActivatedRouteSnapshot {
    if (childPath !== undefined) {
        Object.assign(route, { firstChild: { routeConfig: { path: childPath } } });
    }

    return route;
}

function snapshot(
    id: string | undefined,
    childPath: string | undefined,
    segments?: UrlSegment[],
): ActivatedRouteSnapshot {
    return withChild(createRouteSnapshot(id === undefined ? {} : { id }, segments), childPath);
}

function titleSnapshot(
    title: string | undefined,
    childPath: string | undefined,
    segments?: UrlSegment[],
): ActivatedRouteSnapshot {
    return withChild(createRouteSnapshot(title === undefined ? {} : { title }, segments), childPath);
}

describe('shouldRerunArticleResolver', () => {
    it('re-runs when the article id changes', () => {
        const from = snapshot('42', '');
        const to = snapshot('43', '');

        expect(shouldRerunArticleResolver(from, to)).toBe(true);
    });

    it('re-runs when a matrix param shadows the id the address names', () => {
        // `/articles/42` -> `/articles/43;id=42`: the merged paramMap reads `42`
        // on both sides, so comparing it would keep article 42 on screen under
        // an address whose segment reads 43.
        const from = snapshot('42', '');
        const to = snapshot('42', '', [new UrlSegment('43', { id: '42' })]);

        expect(shouldRerunArticleResolver(from, to)).toBe(true);
    });

    it('re-runs when returning to the empty "article" tab from a non-empty child route', () => {
        const from = snapshot('42', 'version/:versionId/edit');
        const to = snapshot('42', '');

        expect(shouldRerunArticleResolver(from, to)).toBe(true);
    });

    it('does not re-run when navigating from the "article" tab to a non-empty child route', () => {
        const from = snapshot('42', '');
        const to = snapshot('42', 'history');

        expect(shouldRerunArticleResolver(from, to)).toBe(false);
    });

    it('does not re-run when navigating between two non-empty child routes', () => {
        const from = snapshot('42', 'news');
        const to = snapshot('42', 'history');

        expect(shouldRerunArticleResolver(from, to)).toBe(false);
    });

    it('does not re-run when staying on the "article" tab', () => {
        const from = snapshot('42', '');
        const to = snapshot('42', '');

        expect(shouldRerunArticleResolver(from, to)).toBe(false);
    });
});

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
