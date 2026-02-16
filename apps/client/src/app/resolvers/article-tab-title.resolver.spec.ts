import { createArticleTabTitleResolver } from './article-tab-title.resolver';
import { createMockArticle } from '../pages/article/article-testing.helper';
import { ActivatedRouteSnapshot } from '@angular/router';

const mockArticle = createMockArticle({ title: 'Фотосинтез' });

function createRouteSnapshot(parentData?: Record<string, unknown>): ActivatedRouteSnapshot {
    const parent = parentData ? ({ data: parentData } as ActivatedRouteSnapshot) : undefined;
    return { parent } as ActivatedRouteSnapshot;
}

describe('createArticleTabTitleResolver', () => {
    it('should return composite title when parent has article data', () => {
        const resolver = createArticleTabTitleResolver('История версий');
        const route = createRouteSnapshot({ article: mockArticle });

        const result = resolver(route, {} as never);

        expect(result).toBe('История версий: Фотосинтез');
    });

    it('should return tab name only when parent has no article', () => {
        const resolver = createArticleTabTitleResolver('Новости');
        const route = createRouteSnapshot({ article: undefined });

        const result = resolver(route, {} as never);

        expect(result).toBe('Новости');
    });

    it('should return tab name only when no parent route', () => {
        const resolver = createArticleTabTitleResolver('Обсуждение');
        const route = { parent: undefined } as ActivatedRouteSnapshot;

        const result = resolver(route, {} as never);

        expect(result).toBe('Обсуждение');
    });

    it('should return tab name only when parent data has no article key', () => {
        const resolver = createArticleTabTitleResolver('Кто ссылается');
        const route = createRouteSnapshot({});

        const result = resolver(route, {} as never);

        expect(result).toBe('Кто ссылается');
    });
});
