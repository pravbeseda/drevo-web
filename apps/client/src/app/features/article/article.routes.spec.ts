import { shouldRerunArticleResolver, shouldRerunMissingArticleResolver } from './article.routes';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';

function snapshot(id: string | undefined, childPath: string | undefined): ActivatedRouteSnapshot {
    const firstChild =
        childPath === undefined ? undefined : ({ routeConfig: { path: childPath } } as ActivatedRouteSnapshot);

    return {
        paramMap: convertToParamMap(id === undefined ? {} : { id }),
        firstChild,
    } as ActivatedRouteSnapshot;
}

function titleSnapshot(title: string | undefined, childPath: string | undefined): ActivatedRouteSnapshot {
    const firstChild =
        childPath === undefined ? undefined : ({ routeConfig: { path: childPath } } as ActivatedRouteSnapshot);

    return {
        paramMap: convertToParamMap(title === undefined ? {} : { title }),
        firstChild,
    } as ActivatedRouteSnapshot;
}

describe('shouldRerunArticleResolver', () => {
    it('re-runs when the article id changes', () => {
        const from = snapshot('42', '');
        const to = snapshot('43', '');

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
});
