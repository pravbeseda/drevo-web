import { PicturePendingType } from './dto/picture.dto';

export type { PicturePendingType };

export interface Picture {
    readonly id: number;
    readonly folder: string;
    readonly title: string;
    readonly user: string;
    readonly date: Date;
    readonly width: number | undefined;
    readonly height: number | undefined;
    readonly imageUrl: string;
    readonly thumbnailUrl: string;
}

export interface PictureBatchResponse {
    readonly items: readonly Picture[];
    readonly notFoundIds: readonly number[];
}

export interface PictureListResponse {
    readonly items: readonly Picture[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface PictureListParams {
    readonly query?: string;
    readonly page?: number;
    readonly pageSize?: number;
}

export interface PicturePending {
    readonly id: number;
    readonly pictureId: number;
    readonly pendingType: PicturePendingType;
    readonly title: string | undefined;
    readonly width: number | undefined;
    readonly height: number | undefined;
    readonly user: string;
    readonly date: Date;
    readonly currentTitle: string;
    readonly currentImageUrl: string;
    readonly currentThumbnailUrl: string;
    readonly currentWidth: number | undefined;
    readonly currentHeight: number | undefined;
    readonly pendingImageUrl: string | undefined;
}

export interface PicturePendingListResponse {
    readonly items: readonly PicturePending[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface PictureArticle {
    readonly id: number;
    readonly title: string;
}
