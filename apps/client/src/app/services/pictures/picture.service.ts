import { PictureApiService } from './picture-api.service';
import { DEFAULT_PICTURES_PAGE_SIZE } from './picture.constants';
import { Injectable, inject } from '@angular/core';
import {
    Picture,
    PictureArticle,
    PictureBatchResponse,
    PictureDto,
    PictureListParams,
    PictureListResponse,
    PicturePending,
    PicturePendingDto,
    PicturePendingListResponse,
    PicturesListResponseDto,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PictureEditResult {
    readonly picture: Picture | undefined;
    readonly pending: PicturePending | undefined;
}

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
     * Get multiple pictures by IDs in a single request
     */
    getPicturesBatch(ids: readonly number[]): Observable<PictureBatchResponse> {
        return this.pictureApiService.getPicturesBatch(ids).pipe(
            map(response => ({
                items: response.items.map(dto => this.mapPicture(dto)),
                notFoundIds: response.notFound,
            })),
        );
    }

    /**
     * Update picture title (PATCH).
     * Returns picture for moderators, pending for regular users.
     */
    updateTitle(id: number, title: string): Observable<PictureEditResult> {
        return this.pictureApiService.updateTitle(id, title).pipe(
            map(dto => this.mapEditResponse(dto)),
        );
    }

    /**
     * Replace picture file (and optionally title) via PUT.
     * Returns picture for moderators, pending for regular users.
     */
    editPicture(id: number, formData: FormData): Observable<PictureEditResult> {
        return this.pictureApiService.editPicture(id, formData).pipe(
            map(dto => this.mapEditResponse(dto)),
        );
    }

    /**
     * Delete picture.
     * Returns picture for moderators, pending for regular users.
     */
    deletePicture(id: number): Observable<PictureEditResult> {
        return this.pictureApiService.deletePicture(id).pipe(
            map(dto => this.mapEditResponse(dto)),
        );
    }

    /**
     * Get paginated list of pending picture changes
     */
    getPending(page = 1, pageSize = DEFAULT_PICTURES_PAGE_SIZE): Observable<PicturePendingListResponse> {
        return this.pictureApiService.getPending(page, pageSize).pipe(
            map(response => ({
                items: response.items.map(dto => this.mapPicturePending(dto)),
                total: response.total,
                page: response.page,
                pageSize: response.pageSize,
                totalPages: response.totalPages,
            })),
        );
    }

    approvePending(pendingId: number): Observable<void> {
        return this.pictureApiService.approvePending(pendingId);
    }

    rejectPending(pendingId: number): Observable<void> {
        return this.pictureApiService.rejectPending(pendingId);
    }

    cancelPending(pendingId: number): Observable<void> {
        return this.pictureApiService.cancelPending(pendingId);
    }

    /**
     * Get articles that use a specific picture
     */
    getPictureArticles(pictureId: number): Observable<readonly PictureArticle[]> {
        return this.pictureApiService.getPictureArticles(pictureId);
    }

    private mapEditResponse(dto: PictureDto | PicturePendingDto): PictureEditResult {
        if (this.isPendingDto(dto)) {
            return { picture: undefined, pending: this.mapPicturePending(dto) };
        }
        return { picture: this.mapPicture(dto), pending: undefined };
    }

    private isPendingDto(dto: PictureDto | PicturePendingDto): dto is PicturePendingDto {
        return 'pending' in dto && dto.pending === true;
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

    private mapPicturePending(dto: PicturePendingDto): PicturePending {
        const paddedPicId = String(dto.pp_pic_id).padStart(6, '0');
        const hasPendingFile = dto.pp_type === 'edit_file' || dto.pp_type === 'edit_both';
        return {
            id: dto.pp_id,
            pictureId: dto.pp_pic_id,
            pendingType: dto.pp_type,
            title: dto.pp_title ?? undefined,
            width: dto.pp_width ?? undefined,
            height: dto.pp_height ?? undefined,
            user: dto.pp_user,
            date: new Date(dto.pp_date),
            currentTitle: dto.pic_title,
            currentImageUrl: `/images/${dto.pic_folder}/${paddedPicId}.jpg`,
            currentThumbnailUrl: `/pictures/thumbs/${dto.pic_folder}/${paddedPicId}.jpg`,
            currentWidth: dto.pic_width ?? undefined,
            currentHeight: dto.pic_height ?? undefined,
            pendingImageUrl: hasPendingFile
                ? `/images/pending/${dto.pp_pic_id}_pp${dto.pp_id}.jpg`
                : undefined,
        };
    }
}
