import { createArticleVersionDto } from './articles';
import { ArticleVersionDto, NewsTopicDto } from '@drevo-web/shared';

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
