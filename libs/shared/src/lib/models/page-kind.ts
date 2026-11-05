import { ReviewTarget } from './review';

/**
 * Which kind of wiki page a version belongs to. The value is the backend's
 * route segment (`/api/articles/...`, `/api/news/...`) and the frontend's one
 * (`/articles/:id`, `/news/:id`); the two kinds share the version endpoints.
 */
export type PageKind = 'articles' | 'news';

/** The people's-review target of each page kind. */
export const REVIEW_TARGET: Readonly<Record<PageKind, ReviewTarget>> = {
    articles: 'article',
    news: 'news',
};
