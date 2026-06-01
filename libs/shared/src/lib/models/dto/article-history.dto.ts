/**
 * API request/response interfaces for article version history
 * These interfaces represent the raw API structure
 */

import { ApprovalStatusDto } from './article.dto';

/**
 * Query parameters for GET /api/articles/history
 */
export interface ArticleHistoryRequestDto {
    readonly page?: number;
    readonly pageSize?: number;
    readonly approved?: ApprovalStatusDto;
    readonly author?: string;
    readonly articleId?: number;
    readonly excludeCancelled?: boolean;
}

/**
 * Single article history item from API
 */
export interface ArticleHistoryItemDto {
    readonly versionId: number;
    readonly articleId: number;
    readonly title: string;
    readonly author: string;
    readonly date: string; // ISO 8601
    readonly approved: ApprovalStatusDto;
    readonly new: boolean;
    readonly info: string;
    readonly comment: string;
}

/**
 * Paginated history response from API
 */
export interface ArticleHistoryResponseDto {
    readonly items: readonly ArticleHistoryItemDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
