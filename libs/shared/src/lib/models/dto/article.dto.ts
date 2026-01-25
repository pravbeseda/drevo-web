/**
 * API response interfaces for article data
 * These interfaces represent the raw API response structure
 *
 * Database tables:
 * - articles_pages: page metadata (pg_id, title, redirect, etc.)
 * - articles_versions: version content (id, ArticleId, content, author, etc.)
 *
 * Hierarchy:
 * - ArticlePageDto: page fields only (search results)
 * - ArticleVersionDto: page + version fields (editing)
 * - ArticlePreparedVersionDto: page + version + formatted content (viewing)
 */

/**
 * Article page data from articles_pages table
 * Used for search results in dictionary
 */
export interface ArticlePageDto {
    readonly articleId: number;
    readonly title: string;
    readonly redirect: number;
}

/**
 * Article version data from articles_versions table
 * Extends ArticlePageDto with version-specific fields
 * Used for article editing
 */
export interface ArticleVersionDto extends ArticlePageDto {
    readonly versionId: number;
    readonly content: string;
    readonly author: string;
    readonly date: string; // ISO 8601 format
    readonly approved: boolean;
    readonly new: boolean;
    readonly info: string;
    readonly comment: string;
}

/**
 * Prepared article version with formatted content
 * Extends ArticleVersionDto with pre-formatted HTML content
 * Temporary used for article viewing
 * Should be deleted after releasing client Formatter
 */
export interface ArticlePreparedVersionDto extends ArticleVersionDto {
    readonly formattedContent: string;
}
