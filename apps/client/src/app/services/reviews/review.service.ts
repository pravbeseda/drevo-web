import { ReviewApiService } from './review-api.service';
import { Injectable, inject } from '@angular/core';
import {
    DeleteReviewRequestDto,
    Review,
    ReviewDto,
    ReviewStatus,
    ReviewStatusDto,
    ReviewSummary,
    ReviewSummaryDto,
    ReviewTarget,
    SetReviewRequestDto,
    parseDate,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Raw backend status → domain status. Explicit table (not a cast) so a future
 * divergence in the DTO union surfaces as a compile error here.
 */
const DTO_TO_REVIEW_STATUS: Record<ReviewStatusDto, ReviewStatus> = {
    0: ReviewStatus.Undecided,
    1: ReviewStatus.Approve,
    2: ReviewStatus.Suggest,
    3: ReviewStatus.Disagree,
};

/**
 * Domain service for people's review (premoderation).
 *
 * Single point of access for review operations: uses ReviewApiService for HTTP
 * and maps raw DTOs to frontend domain models (status → enum, dates → Date).
 */
@Injectable({
    providedIn: 'root',
})
export class ReviewService {
    private readonly reviewApiService = inject(ReviewApiService);

    /**
     * Batch review summary for a list of versions (history badge).
     *
     * @param type - Review target (article/news)
     * @param versionIds - Version IDs to summarize
     * @returns Observable with mapped summaries
     */
    getSummary(type: ReviewTarget, versionIds: readonly number[]): Observable<readonly ReviewSummary[]> {
        return this.reviewApiService
            .getSummary(type, versionIds)
            .pipe(map(summaries => summaries.map(dto => this.mapSummary(dto))));
    }

    /**
     * All votes for a single version.
     *
     * @param type - Review target (article/news)
     * @param versionId - Version ID
     * @returns Observable with mapped reviews
     */
    getReviews(type: ReviewTarget, versionId: number): Observable<readonly Review[]> {
        return this.reviewApiService
            .getReviews(type, versionId)
            .pipe(map(reviews => reviews.map(dto => this.mapReview(dto))));
    }

    /**
     * Set/update/clear the current user's vote on a version.
     *
     * @param request - Set request (type, versionId, status, comment)
     * @returns Observable with the updated, mapped reviews
     */
    setReview(request: SetReviewRequestDto): Observable<readonly Review[]> {
        return this.reviewApiService.setReview(request).pipe(map(reviews => reviews.map(dto => this.mapReview(dto))));
    }

    /**
     * Delete a review (self-delete or moderator-delete of another reviewer).
     *
     * @param request - Delete request (type, versionId, optional reviewer)
     * @returns Observable with the updated, mapped reviews
     */
    deleteReview(request: DeleteReviewRequestDto): Observable<readonly Review[]> {
        return this.reviewApiService
            .deleteReview(request)
            .pipe(map(reviews => reviews.map(dto => this.mapReview(dto))));
    }

    private mapSummary(dto: ReviewSummaryDto): ReviewSummary {
        const status = dto.status ?? undefined;
        return {
            versionId: dto.versionId,
            status: status === undefined ? undefined : DTO_TO_REVIEW_STATUS[status],
            total: dto.total,
            needsMyVote: dto.needsMyVote,
        };
    }

    private mapReview(dto: ReviewDto): Review {
        return {
            reviewer: dto.reviewer,
            status: DTO_TO_REVIEW_STATUS[dto.status],
            comment: dto.comment,
            updatedAt: parseDate(dto.updatedAt),
        };
    }
}
