import { ArticleLinkedHereItemDto, ArticleLinkedHereResponseDto } from '@drevo-web/shared';

export function createLinkedHereItemDto(
    overrides: Partial<ArticleLinkedHereItemDto> = {},
    index = 1,
): ArticleLinkedHereItemDto {
    return {
        id: index,
        title: `Ссылающаяся статья ${index}`,
        ...overrides,
    };
}

export function createLinkedHereItemDtoList(count: number, startId = 1): ArticleLinkedHereItemDto[] {
    return Array.from({ length: count }, (_, i) => createLinkedHereItemDto({}, startId + i));
}

export function createLinkedHereResponse(
    items: readonly ArticleLinkedHereItemDto[],
    overrides: Partial<Omit<ArticleLinkedHereResponseDto, 'items'>> = {},
): ArticleLinkedHereResponseDto {
    const total = overrides.total ?? items.length;
    const pageSize = overrides.pageSize ?? 25;
    return {
        items,
        total,
        page: overrides.page ?? 1,
        pageSize,
        totalPages: (overrides.totalPages ?? Math.ceil(total / pageSize)) || 0,
    };
}
