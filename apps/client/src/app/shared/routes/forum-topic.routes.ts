import { forumTopicTitleResolver } from '../resolvers/forum-topic-title.resolver';
import { forumTopicResolver } from '../resolvers/forum-topic.resolver';
import { ForumTopicPageDataService } from '../services/forum-topic-page/forum-topic-page-data.service';
import { Route } from '@angular/router';

/**
 * The topic, addressed with and without the message it anchors on. Both the
 * forum's own list and an article's discussion tab mount it as their children,
 * so the config lives here rather than in either feature.
 *
 * The page-scoped data service is what keeps the title and the data one
 * request: both resolvers read it, and the route's own providers give each
 * address its own instance.
 */
function topicRoute(): Omit<Route, 'path'> {
    return {
        title: forumTopicTitleResolver,
        providers: [ForumTopicPageDataService],
        resolve: { topic: forumTopicResolver },
        loadComponent: () => import('../components/topic-page/topic-page.component').then(m => m.TopicPageComponent),
    };
}

/**
 * A fresh config per caller: the router writes its own bookkeeping onto a
 * route object, so two parents must not share one.
 */
export function forumTopicRoutes(): Route[] {
    return [
        { path: 'topic/:id', ...topicRoute() },
        { path: 'topic/:id/:messageId', ...topicRoute() },
    ];
}
