/** One item of the published news feed (GET /api/news/list). */
export interface NewsFeedItemDto {
    readonly id: number;
    readonly title: string;
    /** `YYYY-MM-DD`; `null` when the news item has no date. */
    readonly newsDate: string | null;
    readonly topics: readonly number[];
    readonly rank: number;
}

export interface NewsFeedResponseDto {
    readonly items: readonly NewsFeedItemDto[];
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

/** A news section (GET /api/news/topics). */
export interface NewsTopicDto {
    readonly id: number;
    readonly title: string;
}
