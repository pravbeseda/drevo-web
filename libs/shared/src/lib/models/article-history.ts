/**
 * Frontend models for article version history
 */

/**
 * Single article history item (frontend model)
 */
export interface ArticleHistoryItem {
    readonly versionId: number;
    readonly articleId: number;
    readonly title: string;
    readonly author: string;
    readonly date: Date;
    readonly approved: number; // -1, 0, 1
    readonly isNew: boolean; // renamed from 'new' (reserved word)
    readonly info: string;
    readonly comment: string;
}

/**
 * Paginated article history response (frontend model)
 */
export interface ArticleHistoryResponse {
    readonly items: readonly ArticleHistoryItem[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

/**
 * Parameters for fetching article history
 */
export interface ArticleHistoryParams {
    readonly page?: number;
    readonly pageSize?: number;
    readonly approved?: number;
    readonly author?: string;
}
