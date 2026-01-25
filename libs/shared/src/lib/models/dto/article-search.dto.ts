/**
 * API response interfaces for article search
 * These interfaces represent the raw API response structure
 */

/**
 * Standard API response wrapper
 * All API endpoints return responses in this format
 */
export interface ApiResponse<T> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: string;
    readonly errorCode?: string;
}

/**
 * Single article search result from API
 */
export interface ArticleSearchResultDto {
    readonly id: number;
    readonly title: string;
}

/**
 * Paginated search response from API
 */
export interface ArticleSearchResponseDto {
    readonly items: readonly ArticleSearchResultDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
