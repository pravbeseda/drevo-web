import {
    ForumMessageDto,
    ForumMessageListResponseDto,
    ForumSectionDto,
    ForumTopicDto,
    ForumTopicListItemDto,
    ForumTopicListResponseDto,
    ForumTopicPageDto,
} from '@drevo-web/shared';

export function createForumTopicListItemDto(
    overrides: Partial<ForumTopicListItemDto> = {},
    index = 1,
): ForumTopicListItemDto {
    return {
        id: index,
        title: `Тема ${index}`,
        author: 'Иванов И.И.',
        createdAt: '2025-03-15T10:00:00+03:00',
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

/** The sections the backend serves; the text ids are the ones `/forum/:part` addresses. */
export const mockForumSections: readonly ForumSectionDto[] = [
    {
        id: 'common',
        name: 'Общий раздел',
        description: 'Обсуждение всего, что не вошло в другие разделы',
    },
    {
        id: 'articles',
        name: 'Обсуждение статей',
        description: 'Вопросы по статьям энциклопедии',
    },
    {
        id: 'news',
        name: 'Обсуждение новостей',
        description: 'Вопросы по новостям',
    },
];

export function createForumTopicDto(overrides: Partial<ForumTopicDto> = {}): ForumTopicDto {
    return {
        id: 7,
        title: 'Тема о преподобном Сергии',
        part: 'common',
        partId: 0,
        article: null,
        author: 'Иванов И.И.',
        createdAt: '2025-03-15T10:00:00+03:00',
        repliesCount: 2,
        ...overrides,
    };
}

export function createForumMessageDto(overrides: Partial<ForumMessageDto> = {}, index = 1): ForumMessageDto {
    return {
        id: index,
        parentId: 0,
        author: { name: 'Иванов И.И.', login: 'ivanov' },
        createdAt: '2025-03-15T10:00:00+03:00',
        html: `<p>Сообщение ${index}</p>`,
        ...overrides,
    };
}

export function createForumTopicPage(
    topic: ForumTopicDto,
    messages: readonly ForumMessageDto[],
    overrides: Partial<Omit<ForumMessageListResponseDto, 'items'>> = {},
): ForumTopicPageDto {
    const total = overrides.total ?? messages.length;
    const pageSize = overrides.pageSize ?? Math.max(messages.length, 1);
    return {
        topic,
        messages: {
            items: messages,
            total,
            page: overrides.page ?? 1,
            pageSize,
            totalPages: overrides.totalPages ?? Math.ceil(total / pageSize),
        },
    };
}
