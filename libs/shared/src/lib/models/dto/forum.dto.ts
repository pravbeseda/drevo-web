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

export interface ForumTopicSectionDto {
    readonly id: string;
    readonly name: string;
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
    /** Null only for a part that names no forum section. */
    readonly section: ForumTopicSectionDto | null;
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

export interface ForumCreateTopicRequestDto {
    readonly part: string;
    /** The article or news item the topic hangs off; left out for a plain section topic. */
    readonly partId?: number;
    readonly title: string;
    readonly text: string;
}

export interface ForumReplyRequestDto {
    readonly text: string;
    /** The answered message; left out to answer the topic itself. */
    readonly parentId?: number;
}

export interface ForumPostedMessageDto {
    readonly message: ForumMessageDto;
    /** False while the post waits for a moderator. */
    readonly approved: boolean;
}

export interface ForumCreatedTopicDto extends ForumPostedMessageDto {
    readonly topicId: number;
}
