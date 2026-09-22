import { forumSectionsResolver } from './resolvers/forum-sections.resolver';
import { forumTopicsResolver } from './resolvers/forum-topics.resolver';
import { forumTopicRoutes } from '../../shared/routes/forum-topic.routes';
import { Route } from '@angular/router';

/**
 * A section's topics. The topic opens as its child, so a wide container shows
 * the list and the topic side by side and a narrow one shows the topic alone —
 * one address either way.
 */
function topicsRoute(children: Route[] = forumTopicRoutes()): Omit<Route, 'path'> {
    return {
        title: 'Форум',
        resolve: { topics: forumTopicsResolver },
        loadComponent: () => import('./pages/topics-page/topics-page.component').then(m => m.TopicsPageComponent),
        children,
    };
}

export const FORUM_ROUTES: Route[] = [
    {
        path: '',
        resolve: { sections: forumSectionsResolver },
        loadComponent: () => import('./pages/forum-page/forum-page.component').then(m => m.ForumPageComponent),
        children: [
            // No section named: every section's topics, the tab the forum opens
            // on, and the list a bare `/forum/topic/:id` opens beside.
            { path: '', ...topicsRoute() },
            { path: ':part', ...topicsRoute() },
        ],
    },
    // One article's or news item's discussion, the legacy address. Its list is a
    // filtered one, not a section, so the section tabs would name the wrong page
    // and a topic opened from it belongs to `/forum/topic/:id` — hence no panel.
    // It sits last: `:part/:partId` would otherwise swallow `topic/:id`.
    { path: ':part/:partId', ...topicsRoute([]), data: { withPanel: false } },
];
