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
    readonly info: string;
    readonly editor: string;
    readonly edited: string | undefined;
    readonly comment: string;
}

/**
 * Prepared article version with formatted content
 * Extends ArticleVersionDto with pre-formatted HTML content
 * Used for article viewing
 */
export interface ArticlePreparedVersionDto extends ArticleVersionDto {
    readonly formattedContent: string;
}

// =============================================================================
// Backward compatibility aliases
// These match the current backend response structure.
// TODO: Remove after backend is updated to return ArticlePreparedVersionDto
// =============================================================================

/**
 * @deprecated Use ArticlePreparedVersionDto when backend is updated
 * Current backend response for article viewing (/api/articles/show/{id})
 * Returns formatted content in 'content' field, missing version metadata
 */
export interface ArticleDetailApi {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string; // formatted HTML (should be formattedContent)
    readonly author: string;
    readonly date: string;
    readonly redirect: number;
}

/**
 * @deprecated Alias for ArticleVersionDto
 * Current backend response for article editing (/api/articles/version/{id})
 */
export type ArticleVersionDetailApi = ArticleVersionDto;
