import { PictureApiService } from './picture-api.service';
import { DEFAULT_PICTURES_PAGE_SIZE } from './picture.constants';
import { Injectable, inject } from '@angular/core';
import { Picture, PictureDto, PictureListParams, PictureListResponse, PicturesListResponseDto } from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Domain service for picture-related operations.
 * Maps API DTOs to frontend models.
 */
@Injectable({
    providedIn: 'root',
})
export class PictureService {
    private readonly pictureApiService = inject(PictureApiService);

    /**
     * Get paginated list of pictures with optional search
     */
    getPictures(params: PictureListParams = {}): Observable<PictureListResponse> {
        const { query = '', page = 1, pageSize = DEFAULT_PICTURES_PAGE_SIZE } = params;

        return this.pictureApiService
            .getPictures(query, page, pageSize)
            .pipe(map(response => this.mapListResponse(response)));
    }

    /**
     * Get picture by ID
     */
    getPicture(id: number): Observable<Picture> {
        return this.pictureApiService.getPicture(id).pipe(map(dto => this.mapPicture(dto)));
    }

    /**
     * Update picture title
     */
    updateTitle(id: number, title: string): Observable<Picture> {
        return this.pictureApiService.updateTitle(id, title).pipe(map(dto => this.mapPicture(dto)));
    }

    private mapListResponse(response: PicturesListResponseDto): PictureListResponse {
        return {
            items: response.items.map(item => this.mapPicture(item)),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
        };
    }

    private mapPicture(dto: PictureDto): Picture {
        const paddedId = String(dto.pic_id).padStart(6, '0');

        return {
            id: dto.pic_id,
            folder: dto.pic_folder,
            title: dto.pic_title,
            user: dto.pic_user,
            date: new Date(dto.pic_date),
            width: dto.pic_width ?? undefined,
            height: dto.pic_height ?? undefined,
            imageUrl: `/images/${dto.pic_folder}/${paddedId}.jpg`,
            thumbnailUrl: `/pictures/thumbs/${dto.pic_folder}/${paddedId}.jpg`,
        };
    }
}
