export interface NewsFeedItem {
    readonly id: number;
    readonly title: string;
    readonly newsDate: Date | undefined;
    readonly topics: readonly number[];
}

export interface NewsFeedParams {
    /** The section to show; absent for every section. */
    readonly topic?: number;
    readonly page?: number;
    readonly pageSize?: number;
}

export interface NewsFeedResponse {
    readonly items: readonly NewsFeedItem[];
    readonly total: number;
    readonly page: number;
    readonly totalPages: number;
}

export interface NewsTopic {
    readonly id: number;
    readonly title: string;
}

export interface CreateNewsRequest {
    readonly title: string;
    /** `YYYY-MM-DD` */
    readonly newsDate: string;
    readonly topic: number;
    readonly content: string;
    readonly info?: string;
}

/** What a moderator may change about a news item besides its text. */
export interface NewsMetaChange {
    readonly title?: string;
    /** `YYYY-MM-DD` */
    readonly newsDate?: string;
    readonly topic?: number;
    readonly rank?: number;
    readonly numlist?: number;
}

export interface NewsMeta {
    readonly articleId: number;
    readonly title: string;
    readonly newsDate: Date | undefined;
    readonly topics: readonly number[];
    readonly rank: number;
    readonly numlist: number;
}
