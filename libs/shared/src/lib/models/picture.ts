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
