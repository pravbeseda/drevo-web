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
    /** Absent when the topic has no last post — the wire's `0`. */
    readonly lastPostId: number | undefined;
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
    /** Absent for a topic that hangs off no article or news item. */
    readonly partId: number | undefined;
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
    /** Absent on a root message — the wire's `0`. */
    readonly parentId: number | undefined;
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
