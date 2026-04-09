import {
    ArticleHistoryItemDto,
    ArticleHistoryResponseDto,
    ArticleSearchResponseDto,
    ArticleSearchResultDto,
    ArticleVersionDto,
} from '@drevo-web/shared';

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

/** Create a single ArticleVersionDto (for show/version-show endpoints) */
export function createArticleVersionDto(
    overrides: Partial<ArticleVersionDto> = {},
    index = 1,
): ArticleVersionDto {
    return {
        articleId: index,
        title: `Статья ${index}`,
        redirect: 0,
        versionId: index * 10,
        content: `<p>Содержимое статьи ${index}</p>`,
        author: 'testuser',
        date: '2025-01-15T12:00:00',
        approved: 1,
        new: false,
        info: '',
        comment: '',
        topics: [],
        ...overrides,
    };
}

/** Create a single ArticleHistoryItemDto */
export function createArticleHistoryItemDto(
    overrides: Partial<ArticleHistoryItemDto> = {},
    index = 1,
): ArticleHistoryItemDto {
    return {
        versionId: index,
        articleId: 1,
        title: 'Статья 1',
        author: 'testuser',
        date: '2025-01-15T12:00:00',
        approved: 1,
        new: false,
        info: '',
        comment: '',
        ...overrides,
    };
}

/** Create a paginated article history response */
export function createArticleHistoryResponse(
    items: readonly ArticleHistoryItemDto[],
    overrides: Partial<Omit<ArticleHistoryResponseDto, 'items'>> = {},
): ArticleHistoryResponseDto {
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

/** Pre-built mock data for article view scenarios */
export const mockArticleViewData = {
    /** Single article version for the article page (article ID 42) */
    single: createArticleVersionDto({
        articleId: 42,
        versionId: 420,
        title: 'Тестовая статья',
        content: '<p>Содержимое тестовой статьи</p>',
    }),

    /** Version for the version tab (version ID 99, article ID 42) */
    version: createArticleVersionDto({
        articleId: 42,
        versionId: 99,
        title: 'Тестовая статья',
        approved: 0,
    }),

    /** History items for the history tab */
    historyItems: [
        createArticleHistoryItemDto({ versionId: 1, articleId: 42, title: 'Тестовая статья' }, 1),
        createArticleHistoryItemDto({ versionId: 2, articleId: 42, title: 'Тестовая статья' }, 2),
    ] as const satisfies readonly ArticleHistoryItemDto[],
};
