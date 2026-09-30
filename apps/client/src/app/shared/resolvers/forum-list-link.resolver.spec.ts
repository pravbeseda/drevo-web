import { forumListLinkResolver } from './forum-list-link.resolver';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/** A route whose ancestors match the given segments, one route per entry. */
function routeUnder(...ancestors: readonly string[][]): ActivatedRouteSnapshot {
    const pathFromRoot = ancestors.map(paths => ({ url: paths.map(path => ({ path })) }));
    return { parent: { pathFromRoot } } as unknown as ActivatedRouteSnapshot;
}

describe('forumListLinkResolver', () => {
    const state = {} as RouterStateSnapshot;

    it.each([
        ['every topic', routeUnder([], [], ['forum'], [], []), '/forum'],
        ['a section', routeUnder([], [], ['forum'], [], ['common']), '/forum/common'],
        ["an article's discussion tab", routeUnder([], [], ['articles'], ['7'], ['forum']), '/articles/7/forum'],
    ])('leads back to the list of %s', (_, route, link) => {
        expect(forumListLinkResolver(route, state)).toBe(link);
    });
});
