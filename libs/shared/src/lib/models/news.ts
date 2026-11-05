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
