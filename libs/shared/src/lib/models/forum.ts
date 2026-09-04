export interface ForumSection {
    /** Text id of a forum part, e.g. "common". */
    readonly id: string;
    readonly name: string;
    readonly description: string;
}

export interface ForumTopicListItem {
    readonly id: number;
    readonly title: string;
    readonly author: string;
    readonly createdAt: Date | undefined;
    readonly repliesCount: number;
    readonly lastPostId: number;
    readonly lastPostAt: Date | undefined;
    readonly pinned: boolean;
}

export interface ForumTopicListResponse {
    readonly items: readonly ForumTopicListItem[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface ForumTopicArticle {
    readonly id: number;
    readonly title: string;
}

export interface ForumTopic {
    readonly id: number;
    readonly title: string;
    readonly part: string;
    readonly partId: number;
    readonly article: ForumTopicArticle | undefined;
    readonly author: string;
    readonly createdAt: Date | undefined;
    readonly repliesCount: number;
}

export interface ForumMessageAuthor {
    readonly name: string;
    /** Absent for guests and unknown names. */
    readonly login: string | undefined;
}

export interface ForumMessage {
    readonly id: number;
    readonly parentId: number;
    readonly author: ForumMessageAuthor;
    readonly createdAt: Date | undefined;
    /** Server-rendered wiki HTML. */
    readonly html: string;
}

export interface ForumMessageListResponse {
    readonly items: readonly ForumMessage[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

export interface ForumTopicPage {
    readonly topic: ForumTopic;
    readonly messages: ForumMessageListResponse;
}
