export interface PictureDto {
    readonly pic_id: number;
    readonly pic_folder: string;
    readonly pic_title: string;
    readonly pic_user: string;
    readonly pic_date: string;
    readonly pic_width: number | null;
    readonly pic_height: number | null;
}

export interface PicturesBatchResponseDto {
    readonly items: readonly PictureDto[];
    readonly notFound: readonly number[];
}

export interface PicturesListResponseDto {
    readonly items: readonly PictureDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export type PicturePendingType = 'edit_title' | 'edit_file' | 'edit_both' | 'delete';

export interface PicturePendingDto {
    readonly pp_id: number;
    readonly pp_pic_id: number;
    readonly pp_type: PicturePendingType;
    readonly pp_title: string | null;
    readonly pp_width: number | null;
    readonly pp_height: number | null;
    readonly pp_user: string;
    readonly pp_date: string;
    readonly pending: true;
    readonly pic_title: string;
    readonly pic_folder: string;
    readonly pic_width: number | null;
    readonly pic_height: number | null;
}

export interface PicturePendingListResponseDto {
    readonly items: readonly PicturePendingDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface PictureArticleDto {
    readonly id: number;
    readonly title: string;
}
