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

/**
 * Article version detail response from API (for editing)
 * Contains raw content and additional version metadata
 */
export interface ArticleVersionDetailApi {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
    readonly author: string;
    readonly date: string; // ISO 8601 format
    readonly redirect: number;
    readonly approved: boolean;
    readonly info: string;
    readonly editor: string;
    readonly edited: string | undefined;
    readonly comment: string;
}
