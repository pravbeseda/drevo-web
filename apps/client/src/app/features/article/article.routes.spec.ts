import { shouldRerunMissingArticleResolver } from './article.routes';
import { createRouteSnapshot } from '../../shared/testing/route-testing.helper';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';

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
