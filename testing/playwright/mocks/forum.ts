import { ForumTopicListItemDto, ForumTopicListResponseDto } from '@drevo-web/shared';

export function createForumTopicListItemDto(
    overrides: Partial<ForumTopicListItemDto> = {},
    index = 1,
): ForumTopicListItemDto {
    return {
        id: index,
        title: `Тема ${index}`,
        author: 'Иванов И.И.',
        createdAt: '2025-03-15 10:00:00',
        repliesCount: 2,
        lastPostId: 0,
        lastPostAt: null,
        pinned: false,
        ...overrides,
    };
}

export function createForumTopicListResponse(
    items: readonly ForumTopicListItemDto[],
    overrides: Partial<Omit<ForumTopicListResponseDto, 'items'>> = {},
): ForumTopicListResponseDto {
    const total = overrides.total ?? items.length;
    const pageSize = overrides.pageSize ?? 20;
    return {
        items,
        total,
        page: overrides.page ?? 1,
        pageSize,
        totalPages: overrides.totalPages ?? Math.ceil(total / pageSize),
    };
}
