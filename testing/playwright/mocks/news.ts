import { createArticleVersionDto } from './articles';
import { ArticleVersionDto, NewsListItemDto, NewsListResponseDto, NewsTopicDto } from '@drevo-web/shared';

const NEWS_LIST_PAGE_SIZE = 25;

export const mockNewsTopics: readonly NewsTopicDto[] = [
    { id: 1, title: 'Церковь' },
    { id: 2, title: 'Общество' },
];

/** A news item as GET /api/news/show returns it: the article payload plus the news fields. */
export function createNewsVersionDto(overrides: Partial<ArticleVersionDto> = {}, index = 1): ArticleVersionDto {
    return createArticleVersionDto(
        {
            title: `Новость ${index}`,
            content: `<p>Текст новости ${index}</p>`,
            newsDate: '2025-01-15',
            topics: [1],
            ...overrides,
        },
        index,
    );
}

/** One news item of a list (GET /api/news/list). */
export function createNewsListItemDto(overrides: Partial<NewsListItemDto> = {}, index = 1): NewsListItemDto {
    return {
        id: index,
        title: `Новость ${index}`,
        newsDate: '2025-01-15',
        topics: [1],
        rank: 0,
        ...overrides,
    };
}

export function createNewsListResponse(
    items: readonly NewsListItemDto[],
    overrides: Partial<Omit<NewsListResponseDto, 'items'>> = {},
): NewsListResponseDto {
    const total = overrides.total ?? items.length;
    return {
        items,
        total,
        page: 1,
        pageSize: NEWS_LIST_PAGE_SIZE,
        totalPages: Math.ceil(total / NEWS_LIST_PAGE_SIZE),
        ...overrides,
    };
}
