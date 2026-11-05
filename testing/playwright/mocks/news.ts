import { createArticleVersionDto } from './articles';
import { ArticleVersionDto, NewsFeedItemDto, NewsFeedResponseDto, NewsTopicDto } from '@drevo-web/shared';

const NEWS_FEED_PAGE_SIZE = 25;

export const mockNewsTopics: readonly NewsTopicDto[] = [
    { id: 1, title: 'Церковь' },
    { id: 2, title: 'Общество' },
];

/** One news item of the feed (GET /api/news/list). */
export function createNewsFeedItemDto(overrides: Partial<NewsFeedItemDto> = {}, index = 1): NewsFeedItemDto {
    return {
        id: index,
        title: `Новость ${index}`,
        newsDate: '2025-01-15',
        topics: [1],
        rank: 0,
        ...overrides,
    };
}

export function createNewsFeedResponse(
    items: readonly NewsFeedItemDto[],
    overrides: Partial<Omit<NewsFeedResponseDto, 'items'>> = {},
): NewsFeedResponseDto {
    const total = overrides.total ?? items.length;
    return {
        items,
        total,
        page: 1,
        pageSize: NEWS_FEED_PAGE_SIZE,
        totalPages: Math.ceil(total / NEWS_FEED_PAGE_SIZE),
        ...overrides,
    };
}

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
