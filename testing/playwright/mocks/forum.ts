import {
    ForumCreatedTopicDto,
    ForumMessageDto,
    ForumPostedMessageDto,
    ForumSectionDto,
    ForumTopicDto,
    ForumTopicListItemDto,
    ForumTopicListResponseDto,
    ForumTopicPageDto,
} from '@drevo-web/shared';

const DEFAULT_PAGE_SIZE = 20;

export function createForumTopicListItemDto(overrides: Partial<ForumTopicListItemDto> = {}): ForumTopicListItemDto {
    return {
        id: 1,
        title: 'Тема 1',
        author: 'Иванов И.И.',
        createdAt: '2025-03-15T10:00:00+03:00',
        repliesCount: 2,
        lastPostId: 0,
        lastPostAt: null,
        pinned: false,
        article: null,
        section: { id: 'common', name: 'Общий раздел' },
        ...overrides,
    };
}

export function createForumTopicListResponse(items: readonly ForumTopicListItemDto[]): ForumTopicListResponseDto {
    return {
        items,
        total: items.length,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalPages: Math.ceil(items.length / DEFAULT_PAGE_SIZE),
    };
}

/** One page of a list of `total` numbered topics, `Тема 1` first. */
export function createForumTopicListPage(
    page: number,
    total: number,
    pageSize = DEFAULT_PAGE_SIZE,
): ForumTopicListResponseDto {
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return {
        items: Array.from({ length: Math.max(last - first + 1, 0) }, (_, index) =>
            createForumTopicListItemDto({ id: first + index, title: `Тема ${first + index}` }),
        ),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
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

/** One page holding every message it is given, so no load-more control appears. */
export function createForumTopicPage(topic: ForumTopicDto, messages: readonly ForumMessageDto[]): ForumTopicPageDto {
    return {
        topic,
        messages: {
            items: messages,
            total: messages.length,
            page: 1,
            pageSize: Math.max(messages.length, 1),
            totalPages: 1,
        },
    };
}

/** One page of a topic whose messages span several pages of `pageSize`. */
export function createForumTopicPageOf(
    topic: ForumTopicDto,
    messages: readonly ForumMessageDto[],
    page: number,
    pageSize: number,
): ForumTopicPageDto {
    return {
        topic,
        messages: {
            items: messages.slice((page - 1) * pageSize, page * pageSize),
            total: messages.length,
            page,
            pageSize,
            totalPages: Math.ceil(messages.length / pageSize),
        },
    };
}

/** What the server answers a reply with: the message as it was stored, approved unless said otherwise. */
export function createForumPostedMessageDto(message: ForumMessageDto, approved = true): ForumPostedMessageDto {
    return { message, approved };
}

/** What the server answers a new topic with. */
export function createForumCreatedTopicDto(
    topicId: number,
    message: ForumMessageDto,
    approved = true,
): ForumCreatedTopicDto {
    return { topicId, message, approved };
}
