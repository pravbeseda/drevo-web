export interface ForumSectionDto {
    /** Text id of a forum part, e.g. "common". */
    readonly id: string;
    readonly name: string;
    readonly description: string;
}

export interface ForumTopicArticleDto {
    readonly id: number;
    readonly title: string;
}

export interface ForumTopicListItemDto {
    readonly id: number;
    readonly title: string;
    readonly author: string;
    readonly createdAt: string | null;
    readonly repliesCount: number;
    readonly lastPostId: number;
    readonly lastPostAt: string | null;
    readonly pinned: boolean;
    /** Absent when `lastPostId` resolves to no row, not when nobody replied. */
    readonly lastAuthor?: string;
    readonly article: ForumTopicArticleDto | null;
}

export interface ForumTopicListResponseDto {
    readonly items: readonly ForumTopicListItemDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface ForumTopicDto {
    readonly id: number;
    readonly title: string;
    readonly part: string;
    readonly partId: number;
    readonly article: ForumTopicArticleDto | null;
    readonly author: string;
    readonly createdAt: string | null;
    readonly repliesCount: number;
}

export interface ForumMessageAuthorDto {
    readonly name: string;
    /** Absent for guests and unknown names. */
    readonly login?: string;
}

export interface ForumMessageDto {
    readonly id: number;
    readonly parentId: number;
    readonly author: ForumMessageAuthorDto;
    readonly createdAt: string | null;
    /** Server-rendered wiki HTML. */
    readonly html: string;
}

export interface ForumMessageListResponseDto {
    readonly items: readonly ForumMessageDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface ForumTopicPageDto {
    readonly topic: ForumTopicDto;
    readonly messages: ForumMessageListResponseDto;
}
