import { resolveNewsCreateSession } from './news-create-session.resolver';
import { ActivatedRouteSnapshot } from '@angular/router';

describe('resolveNewsCreateSession', () => {
    const routeUnder = (parentData: Record<string, unknown>): ActivatedRouteSnapshot =>
        ({ parent: { data: parentData } }) as unknown as ActivatedRouteSnapshot;

    it('opens an empty news item with the sections the news root already resolved', () => {
        const topics = [{ id: 3, title: 'Церковь' }];

        expect(resolveNewsCreateSession(routeUnder({ topics }))).toEqual({
            kind: 'news',
            mode: 'create',
            articleId: 0,
            versionId: 0,
            title: '',
            content: '',
            newsTopics: topics,
        });
    });

    it('opens it with no sections when the root resolved none', () => {
        expect(resolveNewsCreateSession(routeUnder({})).newsTopics).toEqual([]);
    });
});
