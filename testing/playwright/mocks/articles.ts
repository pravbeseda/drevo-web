import { ArticleSearchResponseDto, ArticleSearchResultDto } from '@drevo-web/shared';

/** Create a single ArticleSearchResultDto with overrides */
export function createArticleDto(overrides: Partial<ArticleSearchResultDto> = {}, index = 1): ArticleSearchResultDto {
    return {
        id: index,
        title: `Статья ${index}`,
        ...overrides,
    };
}

/** Create a list of ArticleSearchResultDtos */
export function createArticleDtoList(count: number, startId = 1): ArticleSearchResultDto[] {
    return Array.from({ length: count }, (_, i) => createArticleDto({}, startId + i));
}

/** Create a paginated articles search response */
export function createArticlesSearchResponse(
    items: readonly ArticleSearchResultDto[],
    overrides: Partial<Omit<ArticleSearchResponseDto, 'items'>> = {},
): ArticleSearchResponseDto {
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

/** Pre-built mock data sets for common scenarios */
export const mockArticleData = {
    /** List of 5 articles for main page */
    smallList: createArticleDtoList(5),

    /** List of 25 articles (full page) */
    fullPage: createArticleDtoList(25),
};
