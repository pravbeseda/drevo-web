import { forumTopicTitleResolver } from '../resolvers/forum-topic-title.resolver';
import { forumTopicResolver } from '../resolvers/forum-topic.resolver';
import { ForumTopicPageDataService } from '../services/forum-topic-page/forum-topic-page-data.service';
import { forumTopicRoutes } from './forum-topic.routes';

describe('forumTopicRoutes', () => {
    it('addresses a topic with and without the message it anchors on, and the form that starts one', () => {
        expect(forumTopicRoutes().map(route => route.path)).toEqual(['topic/:id', 'topic/:id/:messageId', 'new']);
    });

    it('resolves the topic and scopes the data service to each address', () => {
        forumTopicRoutes()
            .filter(route => route.path?.startsWith('topic/'))
            .forEach(route => {
                expect(route.title).toBe(forumTopicTitleResolver);
                expect(route.resolve?.['topic']).toBe(forumTopicResolver);
                expect(route.providers).toEqual([ForumTopicPageDataService]);
            });
    });

    it('loads the new-topic form lazily under its own title', async () => {
        const route = forumTopicRoutes().find(candidate => candidate.path === 'new');
        const loaded = await route?.loadComponent?.();

        expect(route?.title).toBe('Новая тема');
        expect(loaded).toBeDefined();
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
