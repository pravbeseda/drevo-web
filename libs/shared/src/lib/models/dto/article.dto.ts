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
 * - ArticleVersionDto: page + version fields
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
    readonly content: string; // can be formatted (/api/articles/show/{id}) or raw
    readonly author: string;
    readonly date: string; // ISO 8601 format
    readonly approved: ApprovalStatusDto;
    readonly new: boolean;
    readonly info: string;
    readonly comment: string;
    readonly topics?: readonly number[];
}

/**
 * Article approval status: -1 (rejected), 0 (pending), 1 (approved)
 */
export type ApprovalStatusDto = -1 | 0 | 1;

/**
 * Request body for saving article version
 */
export interface SaveArticleVersionRequestDto {
    readonly versionId: number;
    readonly content: string;
    readonly info?: string;
}

/**
 * Request body for previewing formatted article content
 */
export interface ArticlePreviewRequestDto {
    readonly content: string;
    readonly articleId: number;
}

/**
 * Response from previewing article content
 */
export interface ArticlePreviewResponseDto {
    readonly content: string;
}

/**
 * Response from saving article version
 */
export interface SaveArticleVersionResponseDto {
    readonly articleId: number;
    readonly versionId: number;
    readonly title: string;
    readonly content: string;
    readonly author: string;
    readonly date: string;
    readonly approved: ApprovalStatusDto;
}
