/**
 * Frontend interface for article detail
 * Used in the application layer after mapping from API
 */
export interface Article {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
    readonly author: string;
    readonly date: Date;
    readonly redirect: boolean;
}
