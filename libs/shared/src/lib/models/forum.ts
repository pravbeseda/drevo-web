export interface ForumSection {
    /** Text id of a forum part, e.g. "common". */
    readonly id: string;
    readonly name: string;
    readonly description: string;
}

export interface ForumTopicArticle {
    readonly id: number;
    readonly title: string;
}

export interface ForumTopicSection {
    /** Text id of a forum part, e.g. "news". */
    readonly id: string;
    readonly name: string;
}

export interface ForumTopicListItem {
    readonly id: number;
    readonly title: string;
    readonly lastPostAt: Date | undefined;
    readonly pinned: boolean;
    /** Full name of who opened the topic. */
    readonly author: string;
    /** Absent for a topic that hangs off no article or news item. */
    readonly article: ForumTopicArticle | undefined;
    readonly section: ForumTopicSection | undefined;
}

export interface ForumTopicListResponse {
    readonly items: readonly ForumTopicListItem[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
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

export interface ForumNewTopic {
    readonly part: string;
    /** The article or news item the topic hangs off; absent for a plain section topic. */
    readonly partId: number | undefined;
    readonly title: string;
    readonly text: string;
}

export interface ForumPostedMessage {
    readonly message: ForumMessage;
    /** False while the post waits for a moderator. */
    readonly approved: boolean;
}

export interface ForumCreatedTopic extends ForumPostedMessage {
    readonly topicId: number;
}

/** Why the forum refused a post: the first message for each field the forms show, and the rest. */
export interface ForumPostErrors {
    readonly title: string | undefined;
    readonly text: string | undefined;
    /** A rule no single field answers for, or a field the forms do not show. */
    readonly other: string | undefined;
}

export type ForumPostOutcome<T> =
    | { readonly status: 'posted'; readonly result: T }
    | { readonly status: 'rejected'; readonly errors: ForumPostErrors };
