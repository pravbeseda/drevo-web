export interface PictureDto {
    readonly pic_id: number;
    readonly pic_folder: string;
    readonly pic_title: string;
    readonly pic_user: string;
    readonly pic_date: string;
    readonly pic_width: number | null;
    readonly pic_height: number | null;
}

export interface PicturesListResponseDto {
    readonly items: readonly PictureDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
