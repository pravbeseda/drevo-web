import { forumTopicTitleResolver } from '../resolvers/forum-topic-title.resolver';
import { forumTopicResolver } from '../resolvers/forum-topic.resolver';
import { ForumTopicPageDataService } from '../services/forum-topic-page/forum-topic-page-data.service';
import { forumTopicRoutes } from './forum-topic.routes';

describe('forumTopicRoutes', () => {
    it('addresses a topic with and without the message it anchors on', () => {
        expect(forumTopicRoutes().map(route => route.path)).toEqual(['topic/:id', 'topic/:id/:messageId']);
    });

    it('resolves the topic and scopes the data service to each address', () => {
        forumTopicRoutes().forEach(route => {
            expect(route.title).toBe(forumTopicTitleResolver);
            expect(route.resolve?.['topic']).toBe(forumTopicResolver);
            expect(route.providers).toEqual([ForumTopicPageDataService]);
        });
    });

    it('hands every caller its own objects — the router writes its bookkeeping onto them', () => {
        const [first] = forumTopicRoutes();
        const [second] = forumTopicRoutes();

        expect(first).not.toBe(second);
    });

    it('loads the topic component lazily', async () => {
        const [route] = forumTopicRoutes();
        const loaded = await route.loadComponent?.();

        expect(loaded).toBeDefined();
    });
});
