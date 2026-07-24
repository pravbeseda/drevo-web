/**
 * Sentinel article id for a not-yet-created article.
 *
 * Load-bearing: it doubles as the discriminator against `ArticleVersion`
 * (real ids are always > 0) and satisfies `PageTitleStrategy`'s `TitleContext`
 * shape, so the page title is built without touching the strategy. Consumers
 * outside this feature (header, PageTitleStrategy) can't import it and instead
 * guard on `articleId > 0` to mean "a real article".
 */
export const MISSING_ARTICLE_ID = 0;

/** Placeholder for an article that does not exist yet. */
export interface MissingArticle {
    readonly articleId: typeof MISSING_ARTICLE_ID;
    readonly title: string;
    readonly canCreate: boolean;
    readonly reason?: string;
}

export function isMissingArticle(value: unknown): value is MissingArticle {
    return typeof value === 'object' && !!value && (value as MissingArticle).articleId === MISSING_ARTICLE_ID;
}
