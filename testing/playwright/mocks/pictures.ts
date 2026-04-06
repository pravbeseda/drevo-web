import { PictureDto, PictureArticleDto, PicturePendingDto, PicturesListResponseDto } from '@drevo-web/shared';

/** Create a single PictureDto with overrides */
export function createPictureDto(overrides: Partial<PictureDto> = {}, index = 1): PictureDto {
    return {
        pic_id: index,
        pic_folder: `folder${index}`,
        pic_title: `Иллюстрация ${index}`,
        pic_user: 'testuser',
        pic_date: '2025-01-15 12:00:00',
        pic_width: 800,
        pic_height: 600,
        ...overrides,
    };
}

/** Create a list of PictureDtos */
export function createPictureDtoList(count: number, startId = 1): PictureDto[] {
    return Array.from({ length: count }, (_, i) => createPictureDto({}, startId + i));
}

/** Create a paginated pictures list response */
export function createPicturesListResponse(
    items: readonly PictureDto[],
    overrides: Partial<Omit<PicturesListResponseDto, 'items'>> = {},
): PicturesListResponseDto {
    const total = overrides.total ?? items.length;
    const pageSize = overrides.pageSize ?? 25;
    return {
        items,
        total,
        page: overrides.page ?? 1,
        pageSize,
        totalPages: overrides.totalPages ?? Math.ceil(total / pageSize),
    };
}

/** Create a PictureArticleDto */
export function createPictureArticleDto(overrides: Partial<PictureArticleDto> = {}, index = 1): PictureArticleDto {
    return {
        id: index,
        title: `Статья ${index}`,
        ...overrides,
    };
}

/** Create a PicturePendingDto with overrides */
export function createPicturePendingDto(overrides: Partial<PicturePendingDto> = {}, index = 1): PicturePendingDto {
    return {
        pp_id: index,
        pp_pic_id: overrides.pp_pic_id ?? 1,
        pp_type: 'edit_title',
        pp_title: `Новый заголовок ${index}`,
        pp_width: null,
        pp_height: null,
        pp_user: 'testuser',
        pp_date: '2025-01-15 12:00:00',
        pending: true,
        pic_title: `Иллюстрация ${index}`,
        pic_folder: `folder${index}`,
        pic_width: 800,
        pic_height: 600,
        ...overrides,
    };
}

/** Pre-built mock data sets for common scenarios */
export const mockPictureData = {
    /** Single picture for detail view */
    single: createPictureDto({ pic_id: 42, pic_title: 'Тестовая иллюстрация', pic_user: 'testuser' }),

    /** List of 5 pictures for gallery */
    smallList: createPictureDtoList(5),

    /** List of 25 pictures (full page) */
    fullPage: createPictureDtoList(25),

    /** Articles linked to a picture */
    articles: [
        createPictureArticleDto({ id: 10, title: 'Первая статья' }),
        createPictureArticleDto({ id: 20, title: 'Вторая статья' }),
    ] as PictureArticleDto[],
};
