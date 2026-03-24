import { DEFAULT_PICTURES_PAGE_SIZE } from './picture.constants';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, PictureDto, PicturesBatchResponseDto, PicturesListResponseDto, assertIsDefined } from '@drevo-web/shared';
import { Observable } from 'rxjs';
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
     * Update picture title
     *
     * @param id - Picture ID
     * @param title - New title
     */
    updateTitle(id: number, title: string): Observable<PictureDto> {
        return this.http
            .patch<ApiResponse<PictureDto>>(
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
}
