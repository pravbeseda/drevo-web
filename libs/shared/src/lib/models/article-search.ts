/**
 * Frontend interfaces for article search
 * These interfaces are used in the application layer after mapping from API
 */

/**
 * Single article search result for frontend use
 */
export interface ArticleSearchResult {
    readonly id: number;
    readonly title: string;
}

/**
 * Paginated search response for frontend use
 */
export interface ArticleSearchResponse {
    readonly items: readonly ArticleSearchResult[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

/**
 * Search parameters for article search
 */
export interface ArticleSearchParams {
    readonly query?: string;
    readonly page?: number;
    readonly pageSize?: number;
}
