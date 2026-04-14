import { DEFAULT_PICTURES_PAGE_SIZE, MAX_PICTURES_BATCH_SIZE } from './picture.constants';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import {
    ApiResponse,
    PictureArticleDto,
    PictureDto,
    PicturePendingDto,
    PicturePendingListResponseDto,
    PicturesBatchResponseDto,
    PicturesListResponseDto,
    assert,
    assertIsDefined,
} from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Low-level API service for picture-related HTTP requests.
 *
 * @internal Use PictureService instead
 */
@Injectable({
    providedIn: 'root',
})
export class PictureApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * Get paginated list of pictures with optional search
     *
     * @param query - Search query for pic_title
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     */
    getPictures(query = '', page = 1, pageSize = DEFAULT_PICTURES_PAGE_SIZE): Observable<PicturesListResponseDto> {
        let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());

        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            params = params.set('q', trimmedQuery);
        }

        return this.http
            .get<ApiResponse<PicturesListResponseDto>>(`${this.apiUrl}/api/pictures`, {
                params,
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get picture by ID
     *
     * @param id - Picture ID
     */
    getPicture(id: number): Observable<PictureDto> {
        return this.http
            .get<ApiResponse<PictureDto>>(`${this.apiUrl}/api/pictures/${id}`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get multiple pictures by IDs in a single request.
     * Max 50 IDs per request.
     */
    getPicturesBatch(ids: readonly number[]): Observable<PicturesBatchResponseDto> {
        if (ids.length === 0) {
            return of({ items: [], notFound: [] });
        }

        assert(ids.length <= MAX_PICTURES_BATCH_SIZE, `getPicturesBatch: ids count ${ids.length} exceeds max ${MAX_PICTURES_BATCH_SIZE}`);

        const params = new HttpParams().set('ids', ids.join(','));

        return this.http
            .get<ApiResponse<PicturesBatchResponseDto>>(`${this.apiUrl}/api/pictures/batch`, {
                params,
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Update picture title (PATCH).
     * Returns PictureDto for moderators (direct edit) or PicturePendingDto for regular users (pending).
     */
    updateTitle(id: number, title: string): Observable<PictureDto | PicturePendingDto> {
        return this.http
            .patch<ApiResponse<PictureDto | PicturePendingDto>>(
                `${this.apiUrl}/api/pictures/${id}`,
                { pic_title: title },
                { withCredentials: true }
            )
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Replace picture file (and optionally title).
     * Returns PictureDto for moderators or PicturePendingDto for regular users.
     */
    editPicture(id: number, formData: FormData): Observable<PictureDto | PicturePendingDto> {
        return this.http
            .post<ApiResponse<PictureDto | PicturePendingDto>>(
                `${this.apiUrl}/api/pictures/${id}/file`,
                formData,
                { withCredentials: true },
            )
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Delete picture.
     * Returns PictureDto for moderators or PicturePendingDto for regular users.
     * May return 409 if picture is used in articles.
     */
    deletePicture(id: number): Observable<PictureDto | PicturePendingDto> {
        return this.http
            .delete<ApiResponse<PictureDto | PicturePendingDto>>(
                `${this.apiUrl}/api/pictures/${id}`,
                { withCredentials: true, context: new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [409]) },
            )
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get paginated list of pending picture changes
     */
    getPending(page = 1, pageSize = DEFAULT_PICTURES_PAGE_SIZE): Observable<PicturePendingListResponseDto> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', pageSize.toString());

        return this.http
            .get<ApiResponse<PicturePendingListResponseDto>>(
                `${this.apiUrl}/api/pictures/pending`,
                { params, withCredentials: true }
            )
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Approve a pending picture change (moderator only)
     */
    approvePending(pendingId: number): Observable<void> {
        return this.http
            .post<ApiResponse<null>>(
                `${this.apiUrl}/api/pictures/pending/${pendingId}/approve`,
                {},
                { withCredentials: true }
            )
            .pipe(map(() => undefined));
    }

    /**
     * Reject a pending picture change (moderator only)
     */
    rejectPending(pendingId: number): Observable<void> {
        return this.http
            .post<ApiResponse<null>>(
                `${this.apiUrl}/api/pictures/pending/${pendingId}/reject`,
                {},
                { withCredentials: true }
            )
            .pipe(map(() => undefined));
    }

    /**
     * Cancel own pending picture change
     */
    cancelPending(pendingId: number): Observable<void> {
        return this.http
            .post<ApiResponse<null>>(
                `${this.apiUrl}/api/pictures/pending/${pendingId}/cancel`,
                {},
                { withCredentials: true }
            )
            .pipe(map(() => undefined));
    }

    /**
     * Get articles that use a specific picture
     */
    getPictureArticles(pictureId: number): Observable<readonly PictureArticleDto[]> {
        return this.http
            .get<ApiResponse<{ readonly items: readonly PictureArticleDto[] }>>(
                `${this.apiUrl}/api/pictures/${pictureId}/articles`,
                { withCredentials: true }
            )
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data.items;
                })
            );
    }
}
