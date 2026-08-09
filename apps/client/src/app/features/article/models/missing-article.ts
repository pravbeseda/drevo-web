/**
 * Placeholder for an article that does not exist yet.
 *
 * `articleId: 0` is load-bearing: it doubles as the discriminator against
 * `ArticleVersion` and satisfies `PageTitleStrategy`'s `TitleContext` shape,
 * so the page title is built without touching the strategy.
 */
export interface MissingArticle {
    readonly articleId: 0;
    readonly title: string;
    readonly canCreate: boolean;
    readonly reason?: string;
}

export function isMissingArticle(value: unknown): value is MissingArticle {
    return typeof value === 'object' && !!value && (value as { readonly articleId?: unknown }).articleId === 0;
}
