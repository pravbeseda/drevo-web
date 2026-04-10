import {
    ArticleHistoryItemDto,
    ArticleHistoryResponseDto,
    ArticleSearchResponseDto,
    ArticleSearchResultDto,
    ArticleVersionDto,
    ModerationResponseDto,
    SaveArticleVersionResponseDto,
    VersionForDiffDto,
    VersionPairsResponseDto,
} from '@drevo-web/shared';
import { mockUsers } from './users';

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

/** Create a SaveArticleVersionResponseDto (response from POST /api/articles/save) */
export function createSaveArticleVersionResponseDto(
    overrides: Partial<SaveArticleVersionResponseDto> = {},
): SaveArticleVersionResponseDto {
    return {
        articleId: 42,
        versionId: 421,
        title: 'Тестовая статья',
        content: '<p>Содержимое тестовой статьи</p>',
        author: 'testuser',
        date: '2025-01-15T13:00:00',
        approved: 0,
        ...overrides,
    };
}

/** Create a ModerationResponseDto (response from POST /api/articles/moderate) */
export function createModerationResponseDto(
    overrides: Partial<ModerationResponseDto> = {},
): ModerationResponseDto {
    return {
        versionId: 420,
        articleId: 42,
        approved: 1,
        ...overrides,
    };
}

/** Pre-built mock data for article edit scenarios */
export const mockArticleEditData = {
    /** Version loaded for editing (article ID 42, version ID 420) */
    version: createArticleVersionDto({
        articleId: 42,
        versionId: 420,
        title: 'Тестовая статья',
        content: 'Исходный текст статьи',
        approved: 0,
    }),
};

/** Create a single VersionForDiffDto with overrides */
export function createVersionForDiffDto(
    overrides: Partial<VersionForDiffDto> = {},
    index = 1,
): VersionForDiffDto {
    return {
        articleId: 42,
        versionId: index * 100,
        content: `Содержимое версии ${index}`,
        author: mockUsers.authenticated.login,
        date: `2025-01-${String(index).padStart(2, '0')}T12:00:00`,
        title: 'Тестовая статья',
        info: `Правка ${index}`,
        approved: 1,
        ...overrides,
    };
}

/** Create a VersionPairsResponseDto (response from GET /api/articles/versionpairs) */
export function createVersionPairsResponse(
    current: Partial<VersionForDiffDto> = {},
    previous: Partial<VersionForDiffDto> = {},
): VersionPairsResponseDto {
    return {
        current: createVersionForDiffDto({ versionId: 200, ...current }, 2),
        previous: createVersionForDiffDto({ versionId: 199, ...previous }, 1),
    };
}

/** Pre-built mock data for diff scenarios */
export const mockDiffData = {
    /** Default version pair for diff page tests (current=200, previous=199) */
    default: createVersionPairsResponse(),
};
