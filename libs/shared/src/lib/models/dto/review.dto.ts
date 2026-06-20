/**
 * API response/request interfaces for people's review (premoderation).
 * These mirror the raw backend payloads; mapping to domain models lives in
 * ReviewService.
 */

/**
 * Raw review status from backend: 0 undecided, 1 approve, 2 suggest, 3 disagree.
 */
export type ReviewStatusDto = 0 | 1 | 2 | 3;

/**
 * Review target as sent to/received from the backend (selects the model).
 */
export type ReviewTargetDto = 'article' | 'news';

/**
 * Single reviewer vote, as returned by list/set/delete endpoints.
 */
export interface ReviewDto {
    readonly reviewer: string;
    readonly status: ReviewStatusDto;
    readonly statusLabel: string;
    readonly comment: string;
    readonly updatedAt: string; // ISO 8601 / datetime string
}

/**
 * Aggregated summary for a single version (batch summary endpoint).
 * `status` is null when there is no significant verdict to display.
 */
export interface ReviewSummaryDto {
    readonly versionId: number;
    readonly status: ReviewStatusDto | null;
    readonly total: number;
    readonly needsMyVote: boolean;
}

/**
 * Request body for setting/updating a vote.
 */
export interface SetReviewRequestDto {
    readonly type: ReviewTargetDto;
    readonly versionId: number;
    readonly status: ReviewStatusDto;
    readonly comment: string;
}

/**
 * Request body for deleting a review. `reviewer` omitted → self-delete.
 */
export interface DeleteReviewRequestDto {
    readonly type: ReviewTargetDto;
    readonly versionId: number;
    readonly reviewer?: string;
}
