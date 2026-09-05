import { forumSectionsResolver } from './resolvers/forum-sections.resolver';
import { forumTopicTitleResolver } from './resolvers/forum-topic-title.resolver';
import { forumTopicResolver } from './resolvers/forum-topic.resolver';
import { forumTopicsResolver } from './resolvers/forum-topics.resolver';
import { ForumTopicPageDataService } from './services/forum-topic-page-data.service';
import { Route } from '@angular/router';

/**
 * The topic page, addressed with and without the message it anchors on. The
 * page-scoped data service is what keeps the title and the data one request:
 * both resolvers read it, and the route's own providers give each address its
 * own instance.
 */
const TOPIC_ROUTE: Omit<Route, 'path'> = {
    title: forumTopicTitleResolver,
    providers: [ForumTopicPageDataService],
    resolve: { topic: forumTopicResolver },
    loadComponent: () => import('./pages/topic-page/topic-page.component').then(m => m.TopicPageComponent),
};

const TOPICS_ROUTE: Omit<Route, 'path'> = {
    title: 'Форум',
    resolve: { topics: forumTopicsResolver },
    loadComponent: () => import('./pages/topics-page/topics-page.component').then(m => m.TopicsPageComponent),
};

export const FORUM_ROUTES: Route[] = [
    // Must stay ahead of the tabbed shell, whose `:part` child swallows `topic`.
    { path: 'topic/:id', ...TOPIC_ROUTE },
    { path: 'topic/:id/:messageId', ...TOPIC_ROUTE },
    // One article's or news item's discussion, the legacy address. Its list is a
    // filtered one, not a section, so the section tabs would name the wrong page.
    { path: ':part/:partId', ...TOPICS_ROUTE },
    {
        path: '',
        resolve: { sections: forumSectionsResolver },
        loadComponent: () => import('./pages/forum-page/forum-page.component').then(m => m.ForumPageComponent),
        children: [
            // No section named: every section's topics, the tab the forum opens on.
            { path: '', ...TOPICS_ROUTE },
            { path: ':part', ...TOPICS_ROUTE },
        ],
    },
];
