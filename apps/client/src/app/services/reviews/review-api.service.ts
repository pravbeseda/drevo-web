import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import {
    ApiResponse,
    DeleteReviewRequestDto,
    ReviewDto,
    ReviewSummaryDto,
    ReviewTarget,
    SetReviewRequestDto,
    assertIsDefined,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Low-level API service for people's review (premoderation) HTTP requests.
 *
 * IMPORTANT: do NOT use directly from components — go through ReviewService,
 * which maps DTOs to domain models.
 *
 * @internal Use ReviewService instead
 */
@Injectable({
    providedIn: 'root',
})
export class ReviewApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * Batch review summary for a list of versions (history badge).
     *
     * SKIP_ERROR_NOTIFICATION: when the feature flag is off the backend returns
     * 404 FEATURE_DISABLED, which callers treat as "no reviews" rather than an
     * error to surface.
     *
     * @param type - Review target (article/news)
     * @param versionIds - Version IDs to summarize
     * @returns Observable with raw summary list
     */
    getSummary(type: ReviewTarget, versionIds: readonly number[]): Observable<readonly ReviewSummaryDto[]> {
        const params = new HttpParams().set('versionIds', versionIds.join(','));

        return this.http
            .get<ApiResponse<readonly ReviewSummaryDto[]>>(`${this.apiUrl}/api/reviews/summary/${type}`, {
                params,
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * All votes for a single version.
     *
     * @param type - Review target (article/news)
     * @param versionId - Version ID
     * @returns Observable with raw review list
     */
    getReviews(type: ReviewTarget, versionId: number): Observable<readonly ReviewDto[]> {
        return this.http
            .get<
                ApiResponse<readonly ReviewDto[]>
            >(`${this.apiUrl}/api/reviews/list/${type}/${versionId}`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Set/update/clear the current user's vote on a version.
     *
     * @param request - Set request (type, versionId, status, comment)
     * @returns Observable with the updated review list
     */
    setReview(request: SetReviewRequestDto): Observable<readonly ReviewDto[]> {
        return this.http
            .post<
                ApiResponse<readonly ReviewDto[]>
            >(`${this.apiUrl}/api/reviews/set`, request, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Delete a review (self-delete or moderator-delete of another reviewer).
     *
     * @param request - Delete request (type, versionId, optional reviewer)
     * @returns Observable with the updated review list
     */
    deleteReview(request: DeleteReviewRequestDto): Observable<readonly ReviewDto[]> {
        return this.http
            .post<
                ApiResponse<readonly ReviewDto[]>
            >(`${this.apiUrl}/api/reviews/delete`, request, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }
}
