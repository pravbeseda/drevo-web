/**
 * API response interfaces for article detail
 * These interfaces represent the raw API response structure for single article
 */

/**
 * Article detail response from API
 */
export interface ArticleDetailApi {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
    readonly author: string;
    readonly date: string; // ISO 8601 format
    readonly redirect: number;
}
